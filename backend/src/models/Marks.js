const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema({
  studentId: String,
  subjects: [
    {
      subjectId: String,
      components: [
        {
          label: String,
          raw_score: Number,
          max_score: Number,
          converts_to: Number
        }
      ]
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Marks", marksSchema);