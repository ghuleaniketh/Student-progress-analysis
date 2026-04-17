const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({
  studentId: String,
  overall_percentage: Number,
  grade: String,
  weak_subjects: [String],
  strong_subjects: [String],
  recommendations: [String],
  subjects: Array,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Analysis", analysisSchema);