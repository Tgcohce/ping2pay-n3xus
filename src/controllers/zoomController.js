// controllers/zoomController.js
const zoomService = require('../services/zoomService');

/**
 * Controller to handle Zoom meeting creation request.
 */
exports.createMeeting = async (req, res, next) => {
    console.log("\n--- Received request for /zoom/create-meeting ---");
    try {
        // Extract meeting details from request body sent by frontend
        const { topic, startTimeISO, durationMinutes } = req.body;

        if (!topic || !startTimeISO || !durationMinutes) {
            return res.status(400).json({ error: "Missing required fields: topic, startTimeISO, durationMinutes" });
        }

        // Prepare details for the service
        const meetingDetails = {
            topic: topic,
            start_time: startTimeISO, // Frontend should send in ISO 8601 format
            duration: parseInt(durationMinutes, 10), // Ensure duration is a number
            // userId: 'me' // Or get specific user ID if needed
        };

        console.log("Calling zoomService.createZoomMeeting with details:", meetingDetails);
        const createdMeeting = await zoomService.createZoomMeeting(meetingDetails);

        console.log("Zoom meeting creation successful in controller.");
        // Send back relevant meeting info (e.g., ID, join URL)
        res.json({
            success: true,
            message: "Zoom meeting created successfully.",
            meetingId: createdMeeting.id,
            joinUrl: createdMeeting.join_url,
            startUrl: createdMeeting.start_url // Host URL (handle with care)
            // You might want to store meetingId and joinUrl associated with the escrow/user in your DB here
        });
        console.log("--- Successfully processed /zoom/create-meeting ---");

    } catch (error) {
        console.error("!!! Error in createMeeting controller:", error.message);
        // Pass error to the Express error handler
        // Send a generic error response or specific error if safe
        res.status(500).json({ error: "Failed to create Zoom meeting", details: error.message });
        next(error); // Optional: pass to Express error handler middleware
    }
};

// Add other controller functions later (e.g., for checking attendance)
