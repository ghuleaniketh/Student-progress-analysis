const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db.js");
const analyseRoutes = require("./src/routes/analyse.routes.js");
const cors = require("cors");

dotenv.config();

const origin1 = process.env.CORS_ORIGIN;
const origin2 = process.env.CORS_ORIGIN2;

const app = express();
app.use(cors({
  origin: [origin1, origin2],
  allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"]
}));
// Middleware
app.use(express.json());

// Routes
app.use("/api", analyseRoutes);

// Connect DB
connectDB();

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});