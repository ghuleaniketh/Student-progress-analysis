const mongoose = require("mongoose");

const ComponentResultSchema = new mongoose.Schema({
  label:           String,
  raw_score:       Number,
  max_score:       Number,
  converts_to:     Number,
  converted_score: Number,
  unit_covered:    String,
});

const SubjectResultSchema = new mongoose.Schema({
  subject_id:      String,
  name:            String,
  total:           Number,
  classification:  String,   // "Weak" | "Average" | "Strong"
  components:      [ComponentResultSchema],
  recommendations: [String],
});

const analysisSchema = new mongoose.Schema({
  studentId:          { type: String, required: true, unique: true },
  studentName:        String,
  overall_percentage: Number,
  grade:              String,
  subject_results:    [SubjectResultSchema],
  weak_subjects:      [String],
  strong_subjects:    [String],
  recommendations:    [String],
  createdAt:          { type: Date, default: Date.now },
});

module.exports = mongoose.model("Analysis", analysisSchema);