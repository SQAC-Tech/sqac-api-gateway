require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cron = require('node-cron');
const xlsx = require('xlsx');

const Data = require('./models/Data');
const Contact = require('./models/Contact');
const { storage } = require('./utils/cloudinary');
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.WEBSITE_MONGO_URI || process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Website: MongoDB connected'))
  .catch(err => console.log(err));

app.get('/api/data', async (req, res) => {
  try {
    const data = await Data.find({});
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/data/field/:fieldName', async (req, res) => {
  const field = req.params.fieldName;
  try {
    const data = await Data.find({}, { [field]: 1, _id: 0 });
    res.json(data.map(d => d[field]));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/upload/:id', upload.single('image'), async (req, res) => {
  try {
    const id = req.params.id;
    const imageUrl = req.file.path;

    const updatedData = await Data.findByIdAndUpdate(
      id,
      { image: imageUrl },
      { new: true }
    );

    res.json(updatedData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.send('Backend is running');
});

app.post('/api/contact', async (req, res) => {
  try {
    console.log('Contact form submission received:', req.body);
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    const contact = new Contact({
      name,
      email,
      message
    });

    await contact.save();
    console.log('Contact saved to MongoDB:', contact._id);
    res.status(201).json({ message: 'Contact form submitted successfully', contact });
  } catch (err) {
    console.error('Error saving contact:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/contact', async (req, res) => {
  const contacts = await Contact.find().sort({ submittedAt: -1 });
  res.json(contacts);
});

cron.schedule('0 * * * *', async () => {
  console.log('Running Excel to MongoDB sync...');

  try {
    const workbook = xlsx.readFile('data.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    await Data.deleteMany({});
    await Data.insertMany(jsonData);

    console.log('Excel data synced to MongoDB successfully.');
  } catch (err) {
    console.log('Error syncing Excel to MongoDB:', err);
  }
});
// No app.listen — the gateway owns the HTTP server.
// Exported so gateway.js can mount this app under the single entry point.
module.exports = app;