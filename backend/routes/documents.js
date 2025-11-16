const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const { extractTextForFile, generateEmbedding, generateTagsForText, snippetForQuery } = require('../utils/doc-utils');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2,9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload endpoint
// - extracts text from uploaded file (pdf/docx/pptx/txt)
// - generates embeddings & tags (requires OPENAI_API_KEY in env)
// - stores metadata + embedding inside doc.meta.embedding
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, tags } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'File required' });

    const filePath = path.join(uploadDir, file.filename);
    const bodyText = await extractTextForFile(filePath, file.mimetype);

    // create base document
    const doc = new Document({
      title: title || file.originalname,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      bodyText,
      tags: tags ? tags.split(',').map(t => t.trim()) : []
    });

    // If OPENAI key present, generate embedding and auto-tags
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && bodyText && bodyText.trim().length > 0) {
        const embedding = await generateEmbedding(bodyText);
        if (embedding) doc.meta.embedding = embedding;

        // generate 5 tags using AI
        const autoTags = await generateTagsForText(bodyText);
        if (autoTags && autoTags.length) {
          // merge unique tags
          const merged = Array.from(new Set([...(doc.tags || []), ...autoTags]));
          doc.tags = merged;
        }
      }
    } catch (aiErr) {
      console.warn('AI tag/embedding generation failed:', aiErr && aiErr.message ? aiErr.message : aiErr);
      // not fatal; continue
    }

    await doc.save();
    res.json({ success: true, doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// Serve file (preview/download)
router.get('/file/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const filepath = path.join(uploadDir, doc.filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File missing on disk' });
    res.sendFile(filepath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'File download failed' });
  }
});

// Recent documents
router.get('/recent', async (req, res) => {
  const per = Math.max(1, parseInt(req.query.per || '10'));
  const docs = await Document.find().sort({ uploadedAt: -1 }).limit(per);
  res.json({ results: docs });
});

// Categories / tags summary
router.get('/categories', async (req, res) => {
  // returns tags with counts
  const pipeline = [
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ];
  const tags = await Document.aggregate(pipeline);
  res.json({ tags });
});

// Auto-categorization: Generate tags using OpenAI
router.post("/auto-categorize/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // must have text to categorize
    if (!doc.bodyText || doc.bodyText.trim().length === 0) {
      return res.status(400).json({ error: "Document has no text" });
    }

    // generate tags using your current util
    const newTags = await generateTagsForText(doc.bodyText);

    // merge with existing
    const merged = Array.from(new Set([...(doc.tags || []), ...(newTags || [])]));

    doc.tags = merged;
    await doc.save();

    res.json({
      success: true,
      id: doc._id,
      tags: doc.tags
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Auto-categorization failed", details: err.message });
  }
});


// Search endpoint supports:
// - ?mode=keyword (default): MongoDB text search
// - ?mode=semantic: OpenAI embeddings semantic search (requires OPENAI_API_KEY)
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const per = Math.max(5, parseInt(req.query.per || '10'));
    const mode = req.query.mode || 'keyword';

    if (!q) {
      const docs = await Document.find().sort({ uploadedAt: -1 }).limit(per).skip((page-1)*per);
      return res.json({ results: docs, total: docs.length });
    }

    if (mode === 'semantic') {
      // semantic search via embeddings
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: 'OPENAI_API_KEY required for semantic search' });

      const qEmbedding = await require('../utils/doc-utils').generateEmbedding(q);
      if (!qEmbedding) return res.status(500).json({ error: 'Failed to compute query embedding' });

      // fetch documents that have embeddings (limit scan size)
      // for prototype: fetch up to 200 docs with embeddings
      const docsWithEmb = await Document.find({ 'meta.embedding': { $exists: true } }).limit(200);
      // compute cosine similarity
      const scored = docsWithEmb.map(d => {
        const score = require('../utils/doc-utils').cosineSim(qEmbedding, d.meta.embedding || []);
        return { doc: d, score };
      }).sort((a,b)=> b.score - a.score);

      const start = (page-1)*per;
      const results = scored.slice(start, start+per).map(item => {
        const snippet = snippetForQuery(item.doc.bodyText || '', q);
        return { ...item.doc.toObject(), score: item.score, snippet };
      });

      return res.json({ results, total: scored.length });
    } else {
      // keyword search with MongoDB text index
      const docs = await Document.find(
        { $text: { $search: q } },
        { score: { $meta: "textScore" }, title: 1, originalName: 1, filename: 1, mimetype:1, uploadedAt:1, tags:1, bodyText:1 }
      ).sort({ score: { $meta: "textScore" } })
       .skip((page-1)*per).limit(per);

      const total = await Document.countDocuments({ $text: { $search: q } });

      const results = docs.map(d => {
        const snippet = snippetForQuery(d.bodyText || '', q);
        const obj = d.toObject();
        obj.snippet = snippet;
        return obj;
      });

      return res.json({ results, total });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

module.exports = router;
