const express = require('express');
const router = express.Router();
const meetingsController = require('../controllers/meetingsController');

router.post('/transaction', meetingsController.generateMeetingTransaction);
router.post('/submit', meetingsController.submitSignedTransaction);
router.post('/', meetingsController.createMeeting);
router.post('/:meetingId/join', meetingsController.joinMeeting);
router.post('/:meetingId/attendance', meetingsController.recordAttendance);
router.post('/:meetingId/process-refunds', meetingsController.processRefunds);

module.exports = router;
