const mongoose = require('mongoose');

const connectDB = async (operation) => {
  try {
    await mongoose.connect(process.env.DB_URI, {
      dbName: 'security-db',
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`Connected to MongoDB | ${operation}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

const disconnectDB = async (operation) => {
  try {
    await mongoose.connection.close();
    console.log(`Disconnected from MongoDB | ${operation}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB
};