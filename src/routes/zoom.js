// routes/zoom.js
const express = require("express");
const router = express.Router();
const zoomController = require("../controllers/zoomController"); // Adjust path if needed

// Route for creating a Zoom meeting
router.post("/create-meeting", zoomController.createMeeting);

// Add other routes later (e.g., webhook handler, attendance check endpoint)

module.exports = router;
