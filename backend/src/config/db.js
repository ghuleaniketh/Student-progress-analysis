const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;