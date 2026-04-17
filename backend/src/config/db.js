const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();
const connectDB = async () => {
  try {
    // Support multiple common env var names to avoid mismatches
    const uri = process.env.MONGODB_URI ;

    if (!uri) {
      console.error(
        "DB Error: MongoDB connection string is missing. Please set MONGO_URI or MONGODB_URI in your .env"
      );
      process.exit(1);
    }

    // Mongoose v7+ no longer needs/use the options below; pass the URI only
    const conn = await mongoose.connect(uri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("DB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;