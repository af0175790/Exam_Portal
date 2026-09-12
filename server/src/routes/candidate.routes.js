const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/candidateController');

const router = express.Router();
router.use(requireAuth, requireRole('candidate'));

router.get('/exams', ctrl.listActiveExams);
router.post('/exams/:examId/start', ctrl.startOrResumeAttempt);

router.post('/attempts/:attemptId/questions/:questionId/run', ctrl.runCode);
router.post('/attempts/:attemptId/submit', ctrl.submitAttempt);
router.post('/attempts/:attemptId/violations', ctrl.logViolation);
router.get('/attempts/:attemptId/result', ctrl.myResult);

module.exports = router;
