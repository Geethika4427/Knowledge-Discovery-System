const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  owner: { type: String }, // optional: uploader
  bodyText: { type: String }, // extracted text used for search
  tags: [String],
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// create a text index on title + bodyText for full-text search
DocumentSchema.index({ title: 'text', bodyText: 'text' }, { weights: { title: 5, bodyText: 1 } });

module.exports = mongoose.model('Document', DocumentSchema);
