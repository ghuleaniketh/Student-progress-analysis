const express  = require("express");
const multer   = require("multer");

const {
    analyseStudent,
    ingestSyllabus,
    voiceSTT,
    voiceTTS,
    getCollections,
} = require("../controllers/analyse.controller.js");

const router  = express.Router();
// Store files in memory so we can forward the buffer to Python
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Analysis
router.post("/analyse",   analyseStudent);

// Syllabus ingestion
router.post("/ingest",    upload.single("file"), ingestSyllabus);
router.get("/collections", getCollections);

// Voice
router.post("/voice/stt", upload.single("audio"), voiceSTT);
router.post("/voice/tts", voiceTTS);

module.exports = router;