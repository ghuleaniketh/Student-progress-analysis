const express = require("express");
const { analyseStudent } = require("../controllers/analyse.controller.js");

const router = express.Router();

router.post("/analyse", analyseStudent);

module.exports = router;