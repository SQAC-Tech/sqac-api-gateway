require('dotenv').config();
console.log("MONGO_URI:", process.env.MONGO_URI); // <--- Add this line

require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Data = require('./models/Data');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected for import'))
  .catch(err => console.log(err));

const workbook = xlsx.readFile('Member Information Form For SQAC Website (Responses).xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet);

Data.deleteMany({})
  .then(() => Data.insertMany(jsonData))
  .then(() => {
    console.log('Excel data imported successfully');
    mongoose.connection.close();
  })
  .catch(err => {
    console.log('Error importing data:', err);
    mongoose.connection.close();
  });