const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: String,
  studentId: { type: String, unique: true },
  branch: String,
  semester: Number
});

module.exports = mongoose.model("Student", studentSchema);