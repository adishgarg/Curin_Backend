const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Build MongoDB URI with authentication if credentials are provided
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/curin';
    
    // For production with authentication
    if (process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
      const username = encodeURIComponent(process.env.MONGODB_USERNAME);
      const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
      const authDB = process.env.MONGODB_AUTH_DB || 'admin';
      
      // Replace the basic URI with authenticated URI
      if (mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1')) {
        mongoURI = `mongodb://${username}:${password}@127.0.0.1:27017/curin?authSource=${authDB}`;
      }
    }

    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      family: 4 // Use IPv4, skip trying IPv6
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });

    // Handle app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
