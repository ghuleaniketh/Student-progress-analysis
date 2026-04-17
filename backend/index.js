const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db.js");
const analyseRoutes = require("./src/routes/analyse.routes.js");

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api", analyseRoutes);

// Connect DB
connectDB();

// Start Server
const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});