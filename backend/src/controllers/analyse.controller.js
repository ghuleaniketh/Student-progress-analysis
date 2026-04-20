const axios = require("axios");
const Marks = require("../models/Marks");
const Analysis = require("../models/Analysis");

const PYTHON_URL = process.env.PYTHON_URL || "http://127.0.0.1:8000";

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

// ── Main analysis ─────────────────────────────────────────────────────────────

const analyseStudent = async (req, res) => {
    try {
        const { student_id, student_name, subjects, timetable, collection_name } = req.body;

        if (!student_id || !subjects || !Array.isArray(subjects)) {
            return res.status(400).json({ error: "student_id and subjects array are required" });
        }

        // Enrich each subject with config metadata
        const enrichedSubjects = subjects.map((s) => {
            const config = SUBJECTS_CONFIG.find((c) => c.subject_id === s.subject_id);
            return {
                ...s,
                name: config?.name || s.subject_id,
                units: config?.units || [],
                components: s.components.map((comp, i) => ({
                    ...comp,
                    unit_covered: config?.components?.[i]?.unit_covered || comp.unit_covered || "",
                })),
            };
        });

        // Save raw marks to MongoDB
        await Marks.findOneAndUpdate(
            { studentId: student_id },
            { studentId: student_id, studentName: student_name, subjects, createdAt: new Date() },
            { upsert: true, returnDocument: "after" }
        );

        // Call Python microservice — pass timetable + collection_name for RAG
        const pythonResponse = await axios.post(`${PYTHON_URL}/analyse`, {
            student_id,
            student_name,
            subjects: enrichedSubjects,
            timetable: timetable || [],
            collection_name: collection_name || null,
        });

        const analysisResult = pythonResponse.data;

        // Save analysis result to MongoDB (now includes personalized_feedback)
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
                personalized_feedback: analysisResult.personalized_feedback,
                createdAt: new Date(),
            },
            { upsert: true, returnDocument: "after" }
        );

        return res.status(200).json(analysisResult);
    } catch (err) {
        console.error("Analysis error:", err.message);
        return res.status(500).json({ error: "Analysis failed", detail: err.message });
    }
};

// ── PDF ingestion (proxy to Python) ──────────────────────────────────────────

const ingestSyllabus = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "PDF file is required" });
        }

        const FormData = require("form-data");
        const form = new FormData();
        form.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: "application/pdf",
        });
        form.append("collection_name", req.body.collection_name || "syllabus_default");

        const pythonResponse = await axios.post(`${PYTHON_URL}/ingest`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        return res.status(200).json(pythonResponse.data);
    } catch (err) {
        console.error("Ingest error:", err.message);
        return res.status(500).json({ error: "Ingestion failed", detail: err.message });
    }
};

// ── Voice: STT ────────────────────────────────────────────────────────────────

const voiceSTT = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Audio file required" });

        const FormData = require("form-data");
        const form = new FormData();
        form.append("audio", req.file.buffer, {
            filename: req.file.originalname || "audio.wav",
            contentType: req.file.mimetype || "audio/wav",
        });
        form.append("language", req.body.language || "en-IN");

        const pythonResponse = await axios.post(`${PYTHON_URL}/voice/stt`, form, {
            headers: form.getHeaders(),
        });

        return res.status(200).json(pythonResponse.data);
    } catch (err) {
        console.error("STT error:", err.message);
        return res.status(500).json({ error: "STT failed", detail: err.message });
    }
};

// ── Voice: TTS ────────────────────────────────────────────────────────────────

const voiceTTS = async (req, res) => {
    try {
        const { text, language, speaker } = req.body;
        if (!text) return res.status(400).json({ error: "text is required" });

        const FormData = require("form-data");
        const form = new FormData();
        form.append("text", text);
        form.append("language", language || "en-IN");
        form.append("speaker", speaker || "meera");

        const pythonResponse = await axios.post(`${PYTHON_URL}/voice/tts`, form, {
            headers: form.getHeaders(),
            responseType: "arraybuffer",
        });

        res.set("Content-Type", "audio/wav");
        return res.status(200).send(pythonResponse.data);
    } catch (err) {
        console.error("TTS error:", err.message);
        return res.status(500).json({ error: "TTS failed", detail: err.message });
    }
};

// ── Collections list ──────────────────────────────────────────────────────────

const getCollections = async (req, res) => {
    try {
        const pythonResponse = await axios.get(`${PYTHON_URL}/collections`);
        return res.status(200).json(pythonResponse.data);
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch collections" });
    }
};

module.exports = { analyseStudent, ingestSyllabus, voiceSTT, voiceTTS, getCollections };