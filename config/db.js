const mongoose = require('mongoose');
const dns = require('dns');

// Override DNS servers to Google Public DNS only on Windows platforms if needed
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (dnsErr) {
    console.warn('[DNS Warning] Could not set custom DNS servers:', dnsErr.message);
  }
}

let isMongoConnected = false;

const connectDB = async () => {
  const connStr = process.env.MONGODB_URI;

  if (!connStr) {
    // If running locally without MONGODB_URI, try local DB
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      try {
        const localConnStr = 'mongodb://127.0.0.1:27017/pitch_competition';
        const conn = await mongoose.connect(localConnStr, { serverSelectionTimeoutMS: 2000 });
        isMongoConnected = true;
        console.log(`[MongoDB Local] Connected to local database: ${conn.connection.host}`);
        return;
      } catch (err) {
        // Fallback to in-memory store
      }
    }
    console.log('[MongoDB Notice] MONGODB_URI not set. Operating with fast in-memory store.');
    isMongoConnected = false;
    return;
  }

  try {
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 3000
    });
    isMongoConnected = true;
    console.log(`====================================================`);
    console.log(`✅ [MongoDB Atlas] Connected successfully to host: ${conn.connection.host}`);
    console.log(`====================================================`);
  } catch (error) {
    console.warn(`[MongoDB Atlas Warning] Connection failed: ${error.message}`);
    isMongoConnected = false;
  }
};

const getIsConnected = () => isMongoConnected || mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.getIsConnected = getIsConnected;

