const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const axios = require('axios');

// PDF extraction using pdfjs-dist legacy (works in Node)
// we import lazily inside function to avoid version issues at top-level
async function extractTextFromPDF(filePath) {
  // lazy require for pdfjs-dist legacy build
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  // disable worker in Node
  pdfjsLib.GlobalWorkerOptions.workerSrc = null;
  pdfjsLib.disableWorker = true;

  const dataBuffer = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(dataBuffer);

  const pdfDoc = await pdfjsLib.getDocument({ data: uint8 }).promise;
  let extracted = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    extracted += content.items.map(item => item.str).join(' ') + '\n';
  }
  return extracted;
}

// DOCX extraction with mammoth
async function extractFromDocx(filePath) {
  const res = await mammoth.extractRawText({ path: filePath });
  return res.value || '';
}

// PPTX extraction (simple): unzip and parse slideX.xml text nodes
async function extractFromPptx(filePath) {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();
  const slideEntries = entries.filter(e => e.entryName.startsWith('ppt/slides/slide') && e.entryName.endsWith('.xml'));
  let text = '';
  const parser = new xml2js.Parser();
  for (const entry of slideEntries) {
    try {
      const xml = entry.getData().toString('utf8');
      const parsed = await parser.parseStringPromise(xml);
      // slide text lives under a bunch of nested tags; collect all text nodes
      const texts = [];
      const walk = (node) => {
        if (!node) return;
        if (typeof node === 'string') return texts.push(node);
        if (Array.isArray(node)) return node.forEach(walk);
        if (typeof node === 'object') {
          for (const k of Object.keys(node)) {
            if (k === 't') {
              // t is text node (may be array)
              const val = node[k];
              if (Array.isArray(val)) texts.push(...val.map(v => (typeof v === 'string' ? v : (v._ || ''))));
              else if (typeof val === 'string') texts.push(val);
            } else {
              walk(node[k]);
            }
          }
        }
      };
      walk(parsed);
      text += texts.join(' ') + '\n';
    } catch (e) {
      // ignore slide parse errors
    }
  }
  return text;
}

// Fallback: plain text read
async function extractFromText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Master extractor
// async function extractTextForFile(filePath, mimetype='') {
//   const ext = path.extname(filePath).toLowerCase();
//   try {
//     if (mimetype === 'application/pdf' || ext === '.pdf') {
//       return await extractTextFromPDF(filePath);
//     } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
//       return await extractFromDocx(filePath);
//     } else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === '.pptx') {
//       return await extractFromPptx(filePath);
//     } else if (mimetype && mimetype.startsWith('text/')) {
//       return await extractFromText(filePath);
//     } else {
//       // try text fallback
//       try { return await extractFromText(filePath); } catch(e) { return ''; }
//     }
//   } catch (err) {
//     console.warn('extractTextForFile failed for', filePath, err && err.message ? err.message : err);
//     return '';
//   }
// }

async function extractTextForFile(filePath, mimetype='') {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (mimetype === 'application/pdf' || ext === '.pdf') {
      return await extractTextFromPDF(filePath);

    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
      return await extractFromDocx(filePath);

    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === '.pptx') {
      return await extractFromPptx(filePath);

    } else if (
      mimetype.startsWith("text/") ||
      mimetype === "application/csv" ||
      mimetype === "text/csv" ||
      mimetype === "application/vnd.ms-excel" ||
      ext === ".csv" ||
      ext === ".txt"
    ) {
      // Handle CSV / TXT properly
      return await extractFromText(filePath);

    } else {
      try {
        return await extractFromText(filePath);
      } catch (e) {
        return '';
      }
    }
  } catch (err) {
    console.warn('extractTextForFile failed for', filePath, err?.message || err);
    return '';
  }
}


// OpenAI embedding generation (REST call)
// requires process.env.OPENAI_API_KEY
async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  const url = 'https://api.openai.com/v1/embeddings';
  try {
    const resp = await axios.post(url, {
      input: text,
      model
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });
    if (resp.data && resp.data.data && resp.data.data[0] && resp.data.data[0].embedding) {
      return resp.data.data[0].embedding;
    }
    return null;
  } catch (err) {
    console.error('generateEmbedding error', err && err.response && err.response.data ? err.response.data : err.message);
    return null;
  }
}

// OpenAI-based tag generator (simple prompt)
async function generateTagsForText(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];
  // keep prompt short — request up to 6 short tags
  const prompt = `Extract up to 6 short keyword tags (comma separated) that summarize the topics in the following marketing document. Return only the tags separated by commas.\n\nDocument:\n${text.slice(0, 1500)}`;
  try {
    const url = 'https://api.openai.com/v1/chat/completions';
    const model = process.env.OPENAI_TAG_MODEL || 'gpt-4o-mini'; // if not available, fallback on text completion below
    const resp = await axios.post(url, {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.2
    }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }});

    if (resp.data && resp.data.choices && resp.data.choices[0] && resp.data.choices[0].message) {
      const txt = resp.data.choices[0].message.content || '';
      return txt.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0,6);
    }
  } catch (err) {
    // if chat completions fail (model not available), try older completions endpoint (text-davinci-003 style)
    try {
      const fallbackUrl = 'https://api.openai.com/v1/completions';
      const resp2 = await axios.post(fallbackUrl, {
        model: 'text-davinci-003',
        prompt,
        max_tokens: 60,
        temperature: 0.2
      }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }});
      const txt = resp2.data && resp2.data.choices && resp2.data.choices[0] && resp2.data.choices[0].text ? resp2.data.choices[0].text : '';
      return txt.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0,6);
    } catch (e) {
      console.warn('generateTagsForText fallback failed', e && e.message ? e.message : e);
    }
  }
  return [];
}

// cosine similarity
function cosineSim(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += (a[i] || 0) * (b[i] || 0);
    na += (a[i] || 0) * (a[i] || 0);
    nb += (b[i] || 0) * (b[i] || 0);
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// snippet helper: show a short window around the first match (keyword search)
function snippetForQuery(text, q) {
  if (!text) return '';
  const lower = text.toLowerCase();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  // find first occurrence of any term
  let idx = -1;
  for (const t of terms) {
    const pos = lower.indexOf(t);
    if (pos >= 0 && (idx === -1 || pos < idx)) idx = pos;
  }
  if (idx === -1) {
    // return first 200 chars
    return text.slice(0, 200) + (text.length > 200 ? '...' : '');
  }
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + 120);
  let snippet = text.slice(start, end);
  // highlight matches with simple **...** markers (frontend can style)
  for (const t of terms) {
    const re = new RegExp(escapeRegExp(t), 'ig');
    snippet = snippet.replace(re, (m) => `**${m}**`);
  }
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  extractTextForFile,
  generateEmbedding,
  generateTagsForText,
  cosineSim,
  snippetForQuery
};
