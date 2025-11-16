
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const documentsRouter = require('./routes/documents');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge';
mongoose.connect(MONGODB_URI)
  .then(()=> console.log('Mongo connected'))
  .catch(err => console.error('Mongo connection error:', err));

app.use('/api/documents', documentsRouter);

// static uploads for preview (in dev)
app.use('/uploads', express.static(__dirname + '/uploads'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log(`Server running on ${PORT}`));
