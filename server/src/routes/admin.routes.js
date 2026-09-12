const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/topics', ctrl.listTopics);

router.get('/questions', ctrl.listQuestions);
router.get('/questions/:id', ctrl.getQuestion);
router.post('/questions', ctrl.createQuestion);
router.put('/questions/:id', ctrl.updateQuestion);
router.delete('/questions/:id', ctrl.deleteQuestion);

router.get('/exams', ctrl.listExams);
router.post('/exams', ctrl.createExam);
router.patch('/exams/:id/status', ctrl.updateExamStatus);
router.delete('/exams/:id', ctrl.deleteExam);

router.get('/exams/:examId/results', ctrl.examResults);
router.get('/attempts/:attemptId', ctrl.attemptDetail);
router.get('/violations', ctrl.allViolations);

module.exports = router;
