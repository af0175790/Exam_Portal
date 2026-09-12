const db = require('../config/db');
const { gradeSqlSubmission } = require('../services/sqlRunner');
const { gradePythonSubmission } = require('../services/pythonRunner');

async function listActiveExams(req, res) {
  const r = await db.query(
    `SELECT e.id, e.title, e.description, e.duration_min,
            COUNT(eq.question_id) AS question_count,
            att.id AS attempt_id, att.status AS attempt_status
     FROM exams e
     LEFT JOIN exam_questions eq ON eq.exam_id = e.id
     LEFT JOIN exam_attempts att ON att.exam_id = e.id AND att.candidate_id = $1
     WHERE e.is_active = TRUE
     GROUP BY e.id, att.id
     ORDER BY e.id DESC`,
    [req.user.id]
  );
  res.json(r.rows);
}

// Strip anything that would let a candidate see the graded answers up front.
function sanitizeQuestion(q) {
  const visibleSample = (q.test_cases && q.test_cases[0]) || null;
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    title: q.title,
    statement: q.statement,
    schema_setup: q.type === 'sql' ? q.schema_setup : undefined,
    starter_code: q.starter_code,
    points: q.points,
    sample_test_case: visibleSample
      ? { input: visibleSample.input, expected_output: visibleSample.expected_output }
      : null
  };
}

async function startOrResumeAttempt(req, res) {
  const examId = req.params.examId;
  const candidateId = req.user.id;

  const examRes = await db.query('SELECT * FROM exams WHERE id = $1 AND is_active = TRUE', [examId]);
  if (!examRes.rows.length) return res.status(404).json({ error: 'Exam not found or inactive' });
  const exam = examRes.rows[0];

  let attemptRes = await db.query(
    'SELECT * FROM exam_attempts WHERE exam_id = $1 AND candidate_id = $2',
    [examId, candidateId]
  );

  let attempt;
  if (attemptRes.rows.length) {
    attempt = attemptRes.rows[0];
    if (attempt.status !== 'in_progress') {
      return res.status(409).json({ error: `This exam was already ${attempt.status}` });
    }
  } else {
    const inserted = await db.query(
      `INSERT INTO exam_attempts (exam_id, candidate_id, ip_address, user_agent)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [examId, candidateId, req.ip, req.headers['user-agent'] || null]
    );
    attempt = inserted.rows[0];
  }

  const questionsRes = await db.query(
    `SELECT q.* FROM exam_questions eq
     JOIN questions q ON q.id = eq.question_id
     WHERE eq.exam_id = $1 ORDER BY eq.seq`,
    [examId]
  );

  const submissionsRes = await db.query(
    'SELECT question_id, code, passed_cases, total_cases, score FROM submissions WHERE attempt_id = $1',
    [attempt.id]
  );
  const savedByQuestion = Object.fromEntries(submissionsRes.rows.map((s) => [s.question_id, s]));

  const deadline = new Date(new Date(attempt.started_at).getTime() + exam.duration_min * 60000);

  res.json({
    attempt: { id: attempt.id, status: attempt.status, started_at: attempt.started_at, deadline },
    exam: { id: exam.id, title: exam.title, description: exam.description, max_violations: exam.max_violations },
    questions: questionsRes.rows.map((q) => ({
      ...sanitizeQuestion(q),
      saved: savedByQuestion[q.id] || null
    }))
  });
}

async function assertOwnedActiveAttempt(attemptId, candidateId) {
  const r = await db.query('SELECT a.*, e.max_violations, e.duration_min FROM exam_attempts a JOIN exams e ON e.id = a.exam_id WHERE a.id = $1', [attemptId]);
  const attempt = r.rows[0];
  if (!attempt || attempt.candidate_id !== candidateId) return null;
  return attempt;
}

async function runCode(req, res) {
  const { attemptId, questionId } = req.params;
  const { code } = req.body;
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'code is required' });
  }

  const attempt = await assertOwnedActiveAttempt(attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt is no longer active' });

  const deadline = new Date(attempt.started_at).getTime() + attempt.duration_min * 60000;
  if (Date.now() > deadline) return res.status(409).json({ error: 'Time is up for this exam' });

  const qRes = await db.query('SELECT * FROM questions WHERE id = $1', [questionId]);
  if (!qRes.rows.length) return res.status(404).json({ error: 'Question not found' });
  const question = qRes.rows[0];

  const grading = question.type === 'sql'
    ? await gradeSqlSubmission(question, code)
    : await gradePythonSubmission(question, code);

  await db.query(
    `INSERT INTO submissions (attempt_id, question_id, code, passed_cases, total_cases, score, last_run_at)
     VALUES ($1,$2,$3,$4,$5,$6, NOW())
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET code = $3, passed_cases = $4, total_cases = $5, score = $6, last_run_at = NOW()`,
    [attemptId, questionId, code, grading.passedCases, grading.totalCases, grading.score]
  );

  // Only reveal actual/expected values for the sample (first) test case, to prevent leaking hidden answers.
  const results = grading.results.map((r, i) => (i === 0 ? r : { passed: r.passed, error: r.error }));

  res.json({
    passedCases: grading.passedCases,
    totalCases: grading.totalCases,
    score: grading.score,
    results
  });
}

async function submitAttempt(req, res) {
  const { attemptId } = req.params;
  const attempt = await assertOwnedActiveAttempt(attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt already finalized' });

  const status = req.body?.reason === 'auto' ? 'auto_submitted' : 'submitted';

  const totalRes = await db.query(
    'SELECT COALESCE(SUM(score), 0) AS total FROM submissions WHERE attempt_id = $1',
    [attemptId]
  );

  const updated = await db.query(
    `UPDATE exam_attempts SET status = $1, submitted_at = NOW(), total_score = $2
     WHERE id = $3 RETURNING *`,
    [status, totalRes.rows[0].total, attemptId]
  );

  res.json(updated.rows[0]);
}

async function logViolation(req, res) {
  const { attemptId } = req.params;
  const { type, meta } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });

  const attempt = await assertOwnedActiveAttempt(attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt is no longer active' });

  await db.query(
    'INSERT INTO violations (attempt_id, type, meta) VALUES ($1,$2,$3)',
    [attemptId, type, meta ? JSON.stringify(meta) : null]
  );

  const countRes = await db.query('SELECT COUNT(*) FROM violations WHERE attempt_id = $1', [attemptId]);
  const violationCount = parseInt(countRes.rows[0].count, 10);
  const shouldAutoSubmit = violationCount >= attempt.max_violations;

  if (shouldAutoSubmit) {
    const totalRes = await db.query(
      'SELECT COALESCE(SUM(score), 0) AS total FROM submissions WHERE attempt_id = $1',
      [attemptId]
    );
    await db.query(
      `UPDATE exam_attempts SET status = 'terminated', submitted_at = NOW(), total_score = $1 WHERE id = $2`,
      [totalRes.rows[0].total, attemptId]
    );
  }

  res.json({ violationCount, maxViolations: attempt.max_violations, autoSubmitted: shouldAutoSubmit });
}

async function myResult(req, res) {
  const r = await db.query(
    `SELECT a.*, e.title AS exam_title FROM exam_attempts a
     JOIN exams e ON e.id = a.exam_id
     WHERE a.id = $1 AND a.candidate_id = $2`,
    [req.params.attemptId, req.user.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Attempt not found' });
  res.json(r.rows[0]);
}

module.exports = {
  listActiveExams, startOrResumeAttempt, runCode, submitAttempt, logViolation, myResult
};
