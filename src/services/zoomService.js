// backend/src/services/zoomService.js
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

// Simple in-memory cache for the access token
let zoomAccessToken = null;
let tokenExpiresAt = null;

/**
 * Gets a valid Zoom Server-to-Server OAuth access token.
 * Handles fetching a new token if expired or not present.
 * @returns {Promise<string>} The access token.
 * @throws {Error} If fetching the token fails.
 */
async function getZoomAccessToken() {
    const now = Date.now();

    // Check cache first (refresh a bit before expiry)
    if (zoomAccessToken && tokenExpiresAt && now < tokenExpiresAt - 60 * 1000) {
        // console.log("Using cached Zoom access token."); // Reduce logging noise
        return zoomAccessToken;
    }

    console.log("Fetching new Zoom access token...");
    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
        throw new Error("Zoom API credentials missing in environment variables.");
    }

    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`;
    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await axios.post(tokenUrl, null, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data && response.data.access_token) {
            zoomAccessToken = response.data.access_token;
            tokenExpiresAt = now + (response.data.expires_in * 1000);
            console.log("Successfully fetched new Zoom access token.");
            return zoomAccessToken;
        } else {
            throw new Error("Failed to retrieve access token from Zoom response.");
        }
    } catch (error) {
        console.error("Error fetching Zoom access token:", error.response?.data || error.message);
        zoomAccessToken = null;
        tokenExpiresAt = null;
        throw new Error(`Failed to fetch Zoom access token: ${error.response?.data?.reason || error.message}`);
    }
}

/**
 * Creates a Zoom meeting.
 * @param {object} meetingDetails - Details for the meeting.
 * @param {string} meetingDetails.topic - The meeting topic/title.
 * @param {string} meetingDetails.start_time - Start time in ISO 8601 format (e.g., "2025-04-15T10:00:00Z").
 * @param {number} meetingDetails.duration - Duration in minutes.
 * @param {string} [meetingDetails.userId='me'] - The Zoom user ID to create the meeting under ('me' for the app's owner).
 * @returns {Promise<object>} The created meeting object from Zoom API.
 * @throws {Error} If creating the meeting fails.
 */
async function createZoomMeeting(meetingDetails) {
    const { topic, start_time, duration, userId = 'me' } = meetingDetails;

    if (!topic || !start_time || !duration) {
        throw new Error("Missing required meeting details: topic, start_time, duration.");
    }

    try {
        const accessToken = await getZoomAccessToken();
        const createMeetingUrl = `${ZOOM_API_BASE_URL}/users/${userId}/meetings`;

        console.log(`Creating Zoom meeting with topic: ${topic}`);

        const meetingPayload = {
            topic: topic, type: 2, start_time: start_time, duration: duration,
            timezone: "America/Halifax", // Example: Consider making this configurable
            settings: { join_before_host: false, waiting_room: true, }
        };

        const response = await axios.post(createMeetingUrl, meetingPayload, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });

        console.log("Zoom meeting created successfully via API.");
        return response.data;

    } catch (error) {
        console.error("Error creating Zoom meeting:", error.response?.data || error.message);
        throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
}

/**
 * Fetches participant report for a given Zoom meeting ID.
 * @param {string} meetingId - The numeric ID of the Zoom meeting.
 * @returns {Promise<Array<object>>} A promise resolving to an array of participant objects.
 * @throws {Error} If fetching participants fails.
 */
async function getMeetingParticipants(meetingId) {
    console.log(`Fetching participants for Zoom meeting ID: ${meetingId}`);
    const accessToken = await getZoomAccessToken();
    // Note: Participant reports might only be available for licensed users / paid accounts
    // and might have a delay after the meeting ends. Check Zoom API docs.
    const reportUrl = `${ZOOM_API_BASE_URL}/report/meetings/${meetingId}/participants?page_size=300`; // Adjust page size if needed

    try {
        const response = await axios.get(reportUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        // TODO: Handle pagination if response indicates more pages ('next_page_token')
        console.log(`Found ${response.data?.participants?.length || 0} participants for meeting ${meetingId}.`);
        return response.data.participants || []; // Return array of participant objects
    } catch (error) {
        console.error(`Error fetching participants for meeting ${meetingId}:`, error.response?.data || error.message);
        // Handle specific errors, e.g., 404 if report not ready/meeting invalid
        if (error.response?.status === 404 || error.response?.data?.code === 3001 /* Meeting not found or report not ready */) {
            console.warn(`Participant report not found for meeting ${meetingId}. Might be too soon, meeting invalid, or report disabled.`);
            return []; // Return empty array if report not found yet
        }
        // Throw other errors
        throw new Error(`Failed to fetch participants: ${error.response?.data?.message || error.message}`);
    }
}


module.exports = {
    createZoomMeeting,
    getMeetingParticipants // Export new function
};
