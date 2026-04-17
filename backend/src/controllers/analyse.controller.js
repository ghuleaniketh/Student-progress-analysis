const Marks = require("../models/Marks.js");
const Analysis = require("../models/Analysis.js");
const { analyseWithPython } = require("../services/python.service.js");

const analyseStudent = async (req, res) => {
    try {
        const data = req.body;

        // 1. Save marks
        await Marks.create(data);

        // 2. Call Python service
        const result = await analyseWithPython(data);

        // 3. Save analysis
        await Analysis.create({
            studentId: data.student_id,
            ...result
        });

        res.json(result);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Analysis failed" });
    }
};

module.exports = { analyseStudent };