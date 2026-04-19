const axios = require("axios");
const Marks = require("../models/Marks");
const Analysis = require("../models/Analysis");

const PYTHON_URL = process.env.PYTHON_URL || "http://127.0.0.1:8000";

// Subject config mirrored from frontend — used to enrich Python payload
const SUBJECTS_CONFIG = [
    {
        subject_id: "CSE208",
        name: "Probability & Statistics",
        units: [
            "Unit I – Introduction to Probability",
            "Unit II – Random Variables & Distributions",
            "Unit III – Joint Probability & CLT",
            "Unit IV – Descriptive Statistics",
            "Unit V – Linear Regression & Statistical Inference",
        ],
        components: [
            { label: "CLA 1",   max_score: 100, converts_to: 10, unit_covered: "Unit I" },
            { label: "CLA 2",   max_score: 100, converts_to: 10, unit_covered: "Unit II" },
            { label: "CLA 3",   max_score: 100, converts_to: 10, unit_covered: "Unit III" },
            { label: "Mid",     max_score: 100, converts_to: 20, unit_covered: "Unit I & II" },
            { label: "End Sem", max_score: 100, converts_to: 50, unit_covered: "All Units" },
        ],
    },
    {
        subject_id: "CSE209",
        name: "Database Management System",
        units: [
            "ER Model & Relational Model",
            "SQL & Relational Algebra",
            "Normalization",
            "Transactions & Concurrency",
            "Lab – Queries & Project",
        ],
        components: [
            { label: "Mid (/25)",        max_score: 25,  converts_to: 20, unit_covered: "Unit I & II" },
            { label: "CLA 1 (/10)",      max_score: 10,  converts_to: 5,  unit_covered: "Unit I" },
            { label: "CLA 2 (/10)",      max_score: 10,  converts_to: 5,  unit_covered: "Unit II" },
            { label: "Lab Performance",  max_score: 50,  converts_to: 20, unit_covered: "Lab" },
            { label: "Final Exam (/50)", max_score: 50,  converts_to: 30, unit_covered: "All Units" },
            { label: "Project (/50)",    max_score: 50,  converts_to: 20, unit_covered: "Lab & Project" },
        ],
    },
    {
        subject_id: "FULLSTACK",
        name: "Full Stack Development",
        units: ["React", "Node & Express", "MongoDB", "Auth & Security", "Final Project"],
        components: [
            { label: "CLA 1",         max_score: 20, converts_to: 20, unit_covered: "React" },
            { label: "CLA 2",         max_score: 20, converts_to: 20, unit_covered: "Node & Express" },
            { label: "CLA 3",         max_score: 20, converts_to: 20, unit_covered: "Auth & Security" },
            { label: "MongoDB",       max_score: 20, converts_to: 20, unit_covered: "MongoDB" },
            { label: "Final Project", max_score: 20, converts_to: 20, unit_covered: "All" },
        ],
    },
    {
        subject_id: "CSE205",
        name: "Hands on with Python",
        units: ["Python Basics", "Functions & OOP", "Libraries", "End Sem Project"],
        components: [
            { label: "CLA 1 (/30)",     max_score: 30,  converts_to: 10, unit_covered: "Python Basics" },
            { label: "CLA 2 (/30)",     max_score: 30,  converts_to: 15, unit_covered: "Functions & OOP" },
            { label: "CLA 3 (/30)",     max_score: 30,  converts_to: 25, unit_covered: "Libraries" },
            { label: "End Sem Project", max_score: 100, converts_to: 50, unit_covered: "Full Project" },
        ],
    },
    {
        subject_id: "CODING",
        name: "Coding Skills",
        units: ["Data Structures", "Algorithms", "Problem Solving", "Lab Practice", "Project & Viva"],
        components: [
            { label: "CLA 1",          max_score: 10, converts_to: 10, unit_covered: "Data Structures" },
            { label: "CLA 2",          max_score: 10, converts_to: 10, unit_covered: "Algorithms" },
            { label: "CLA 3",          max_score: 10, converts_to: 10, unit_covered: "Problem Solving" },
            { label: "Lab",            max_score: 20, converts_to: 20, unit_covered: "Lab Practice" },
            { label: "Project & Viva", max_score: 50, converts_to: 50, unit_covered: "Full Project" },
        ],
    },
];

const analyseStudent = async (req, res) => {
    try {
        const { student_id, student_name, subjects } = req.body;

        if (!student_id || !subjects || !Array.isArray(subjects)) {
            return res.status(400).json({ error: "student_id and subjects array are required" });
        }

        // Enrich each subject with config metadata before sending to Python
        const enrichedSubjects = subjects.map((s) => {
            const config = SUBJECTS_CONFIG.find((c) => c.subject_id === s.subject_id);
            return {
                ...s,
                name: config?.name || s.subject_id,
                units: config?.units || [],
                components: s.components.map((comp, i) => ({
                    ...comp,
                    unit_covered: config?.components?.[i]?.unit_covered || "",
                })),
            };
        });

        // Save raw marks to MongoDB
        await Marks.findOneAndUpdate(
            { studentId: student_id },
            { studentId: student_id, studentName: student_name, subjects, createdAt: new Date() },
            { upsert: true, returnDocument: 'after' }
        );

        // Call Python microservice
        const pythonResponse = await axios.post(`${PYTHON_URL}/analyse`, {
            student_id,
            student_name,
            subjects: enrichedSubjects,
        });

        const analysisResult = pythonResponse.data;

        // Save analysis result to MongoDB
        await Analysis.findOneAndUpdate(
            { studentId: student_id },
            {
                studentId: student_id,
                studentName: student_name,
                overall_percentage: analysisResult.overall_percentage,
                grade: analysisResult.grade,
                subject_results: analysisResult.subject_results,
                weak_subjects: analysisResult.weak_subjects,
                strong_subjects: analysisResult.strong_subjects,
                recommendations: analysisResult.overall_recommendations,
                createdAt: new Date(),
            },
            { upsert: true, returnDocument: 'after' }
        );

        return res.status(200).json(analysisResult);
    } catch (err) {
        console.error("Analysis error:", err.message);
        return res.status(500).json({ error: "Analysis failed", detail: err.message });
    }
};

module.exports = { analyseStudent };