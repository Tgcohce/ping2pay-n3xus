// backend/src/database.js - CSV Implementation (Use with Caution!)
const fs = require('fs');
const path = require('path');

const CSV_FILE_PATH = path.join(__dirname, 'data', 'meetings.csv'); // Store CSV in a 'data' subdir
const CSV_HEADERS = [
    "escrowAddress", "initializerAddress", "userEmail", "meetingId",
    "meetingEndTimeISO", "status", "vaultAddress", "stakeAmount",
    "beneficiaryAddress", "initializerAta", "lastTxSignature"
];

// Ensure data directory exists
const dataDir = path.dirname(CSV_FILE_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to read and parse the CSV
function readCsv() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        return []; // Return empty if file doesn't exist
    }
    try {
        const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        const lines = fileContent.trim().split('\n');
        if (lines.length <= 1) return []; // Empty or only headers

        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
            const values = line.split(','); // Basic split, fails if commas in data
            const entry = {};
            headers.forEach((header, index) => {
                entry[header.trim()] = values[index] ? values[index].trim() : undefined;
            });
            return entry;
        });
        return data;
    } catch (error) {
        console.error("Error reading CSV:", error);
        throw new Error("Failed to read meeting data."); // Or return empty array?
    }
}

// Helper to write data array back to CSV
function writeCsv(data) {
    try {
        const headerRow = CSV_HEADERS.join(',');
        const dataRows = data.map(entry =>
            CSV_HEADERS.map(header => entry[header] ?? '').join(',') // Handle missing values
        );
        const csvContent = [headerRow, ...dataRows].join('\n');
        // WARNING: writeFileSync is blocking and not ideal for servers
        // WARNING: Overwrites entire file - potential for data loss / race conditions
        fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf-8');
    } catch (error) {
        console.error("Error writing CSV:", error);
        throw new Error("Failed to write meeting data.");
    }
}

/**
 * Finds meetings that have ended and need attendance checks.
 * @param {Date} currentTime - The current time.
 * @returns {Promise<Array<object>>} - Array of meeting objects to check.
 */
async function findEndedMeetingsToCheck(currentTime) {
    console.log("CSV DB: Finding meetings to check...");
    try {
        const allMeetings = readCsv();
        const meetingsToCheck = allMeetings.filter(meeting => {
            // Check status
            const isPending = ['scheduled', 'ended', 'error_checking', 'error_release_failed'].includes(meeting.status); // Include error states for retry
            if (!isPending) return false;

            // Check time (ensure meetingEndTimeISO is valid)
            try {
                const endTime = new Date(meeting.meetingEndTimeISO);
                // Check if ended within a reasonable window (e.g., last 6 hours) but not too far in future
                const sixHoursAgo = new Date(currentTime.getTime() - 6 * 60 * 60 * 1000);
                return endTime <= currentTime && endTime >= sixHoursAgo;
            } catch (dateError) {
                console.warn(`Invalid date format for escrow ${meeting.escrowAddress}: ${meeting.meetingEndTimeISO}`);
                return false;
            }
        });
        return meetingsToCheck; // Return filtered meetings
    } catch (error) {
        console.error("Error in findEndedMeetingsToCheck:", error);
        return []; // Return empty on error
    }
}

/**
 * Updates the status of a meeting record in the CSV.
 * @param {string} escrowAddress - The primary key identifying the meeting/escrow.
 * @param {string} newStatus - The new status string.
 * @param {string} [signature] - Optional transaction signature for release/refund.
 */
async function updateMeetingStatus(escrowAddress, newStatus, signature = null) {
    console.log(`CSV DB: Updating status for ${escrowAddress} to ${newStatus}` + (signature ? ` with sig ${signature}` : ''));
    try {
        let allMeetings = readCsv();
        let updated = false;
        allMeetings = allMeetings.map(meeting => {
            if (meeting.escrowAddress === escrowAddress) {
                updated = true;
                return {
                    ...meeting,
                    status: newStatus,
                    lastTxSignature: signature ?? meeting.lastTxSignature // Keep old sig if new one not provided
                };
            }
            return meeting;
        });

        if (updated) {
            writeCsv(allMeetings); // Overwrite the entire file
        } else {
            console.warn(`CSV DB: Meeting with escrow ${escrowAddress} not found for status update.`);
        }
    } catch (error) {
        console.error("Error in updateMeetingStatus:", error);
        // Decide how to handle - maybe throw?
    }
}

/**
 * Saves the initial meeting data after creation.
 * @param {object} meetingData - Object containing meeting details. Must match CSV_HEADERS.
 */
async function saveMeeting(meetingData) {
    console.log(`CSV DB: Saving meeting data for escrow ${meetingData?.escrowAddress}`);
    try {
        // Basic validation
        if (!meetingData || !meetingData.escrowAddress) {
            throw new Error("Invalid meeting data provided to saveMeeting.");
        }

        // Check if file exists to write headers
        const fileExists = fs.existsSync(CSV_FILE_PATH);
        if (!fileExists) {
            fs.writeFileSync(CSV_FILE_PATH, CSV_HEADERS.join(',') + '\n', 'utf-8');
            console.log("CSV file created with headers.");
        }

        // Format data into CSV row - ensure order matches CSV_HEADERS
        const row = CSV_HEADERS.map(header => meetingData[header] ?? '').join(',');

        // WARNING: appendFileSync is blocking and not ideal for servers
        fs.appendFileSync(CSV_FILE_PATH, row + '\n', 'utf-8');
        console.log(`Meeting data for ${meetingData.escrowAddress} appended to CSV.`);

    } catch (error) {
        console.error("Error in saveMeeting:", error);
        throw new Error("Failed to save meeting data to CSV.");
    }
}


module.exports = {
    findEndedMeetingsToCheck,
    updateMeetingStatus,
    saveMeeting
};
