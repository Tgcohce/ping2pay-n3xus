// backend/src/scheduler.js
const cron = require('node-cron');
const zoomService = require('./services/zoomService');
const escrowService = require('./services/escrowService');
const db = require('./database'); // Your ACTUAL database implementation
const BN = require('bn.js'); // Import BN

function startScheduler() {
    console.log('Initializing scheduler...');

    // Schedule to run every 5 minutes (adjust as needed)
    // Syntax: second(opt) minute hour day(month) month day(week)
    cron.schedule('*/2 * * * *', async () => {
        console.log(`[${new Date().toISOString()}] Running scheduled attendance check...`);
        const now = new Date();

        try {
            // Find meetings that ended recently and haven't been processed
            const meetingsToCheck = await db.findEndedMeetingsToCheck(now);
            if (!meetingsToCheck || meetingsToCheck.length === 0) {
                console.log("No meetings found to check at this time.");
                return;
            }
            console.log(`Found ${meetingsToCheck.length} meetings to check.`);

            for (const meeting of meetingsToCheck) {
                console.log(`Processing meetingId: ${meeting.meetingId}, escrow: ${meeting.escrowAddress}`);

                // Prevent processing the same meeting multiple times concurrently if cron overlaps
                // Simple check: If status is already 'processing', skip. More robust locking might be needed.
                if (meeting.status === 'processing') {
                    console.log(`Skipping ${meeting.escrowAddress}, already processing.`);
                    continue;
                }
                await db.updateMeetingStatus(meeting.escrowAddress, 'processing');

                let attended = false;
                try {
                    // Get participants from Zoom API
                    const participants = await zoomService.getMeetingParticipants(meeting.meetingId);
                    // Check if the user's email is in the participant list (case-insensitive)
                    attended = participants.some(p =>
                        p.email && meeting.userEmail && // Ensure both emails exist
                        p.email.trim().toLowerCase() === meeting.userEmail.trim().toLowerCase()
                    );
                    console.log(`Attendance check for ${meeting.userEmail}: ${attended}`);

                } catch (zoomError) {
                    console.error(`Failed to check Zoom attendance for meeting ${meeting.meetingId}:`, zoomError);
                    await db.updateMeetingStatus(meeting.escrowAddress, 'error_checking');
                    continue; // Skip to next meeting
                }

                // Determine recipient and trigger release/refund
                let recipientAta = null;
                let newStatus = '';
                if (attended) {
                    recipientAta = meeting.initializerAta; // User's ATA for refund
                    newStatus = 'refunded';
                    console.log(`User attended. Preparing refund to initializer ATA: ${recipientAta}`);
                } else {
                    recipientAta = meeting.beneficiaryAddress; // Beneficiary's ATA
                    newStatus = 'claimed';
                    console.log(`User did NOT attend. Preparing payout to beneficiary ATA: ${recipientAta}`);
                }

                // Validate required data before attempting release
                if (!recipientAta || !meeting.initializerAddress || !meeting.vaultAddress || !meeting.stakeAmount) {
                    console.error(`Cannot release funds for escrow ${meeting.escrowAddress}: Missing required data (recipient ATA, initializer, vault, or amount).`);
                    await db.updateMeetingStatus(meeting.escrowAddress, 'error_release_missing_data');
                    continue;
                }

                try {
                    // Call function to interact with Anchor program's release_funds
                    const releaseSignature = await escrowService.triggerReleaseFunds({
                        escrowAddress: meeting.escrowAddress,
                        initializerAddress: meeting.initializerAddress,
                        vaultAddress: meeting.vaultAddress,
                        recipientTokenAccountAddress: recipientAta,
                        amountLamports: new BN(meeting.stakeAmount) // Ensure amount is BN
                    });
                    console.log(`Release funds transaction successful for ${meeting.escrowAddress}. Signature: ${releaseSignature}`);
                    await db.updateMeetingStatus(meeting.escrowAddress, newStatus, releaseSignature);
                } catch (releaseError) {
                    console.error(`Failed to release funds for escrow ${meeting.escrowAddress}:`, releaseError);
                    await db.updateMeetingStatus(meeting.escrowAddress, 'error_release_failed');
                }
            } // end for loop

        } catch (error) {
            console.error('Error during cron job execution:', error);
        }
    });

    console.log('Cron job scheduled to run every 5 minutes.');
}

module.exports = { startScheduler }; // Export function to start it
