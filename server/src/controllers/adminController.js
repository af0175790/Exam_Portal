const db = require('../config/db');

// ---------- Topics ----------
async function listTopics(req, res) {
  const r = await db.query('SELECT * FROM topics ORDER BY category, name');
  res.json(r.rows);
}

// ---------- Questions ----------
async function listQuestions(req, res) {
  const { type, topic_id } = req.query;
  const clauses = [];
  const params = [];
  if (type) { params.push(type); clauses.push(`q.type = $${params.length}`); }
  if (topic_id) { params.push(topic_id); clauses.push(`q.topic_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const r = await db.query(
    `SELECT q.*, t.name AS topic_name
     FROM questions q LEFT JOIN topics t ON t.id = q.topic_id
     ${where} ORDER BY q.id DESC`,
    params
  );
  res.json(r.rows);
}

async function getQuestion(req, res) {
  const r = await db.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Question not found' });
  res.json(r.rows[0]);
}

async function createQuestion(req, res) {
  const {
    topic_id, type, difficulty, title, statement,
    schema_setup, starter_code, test_cases, time_limit_ms, points
  } = req.body;

  if (!type || !difficulty || !title || !statement || !test_cases) {
    return res.status(400).json({ error: 'type, difficulty, title, statement and test_cases are required' });
  }

  const r = await db.query(
    `INSERT INTO questions
      (topic_id, type, difficulty, title, statement, schema_setup, starter_code, test_cases, time_limit_ms, points, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [topic_id || null, type, difficulty, title, statement,
      schema_setup || null, starter_code || null, JSON.stringify(test_cases),
      time_limit_ms || 5000, points || 10, req.user.id]
  );
  res.status(201).json(r.rows[0]);
}

async function updateQuestion(req, res) {
  const fields = ['topic_id', 'type', 'difficulty', 'title', 'statement',
    'schema_setup', 'starter_code', 'test_cases', 'time_limit_ms', 'points'];
  const updates = [];
  const params = [];

  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      params.push(f === 'test_cases' ? JSON.stringify(req.body[f]) : req.body[f]);
      updates.push(`${f} = $${params.length}`);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  const r = await db.query(
    `UPDATE questions SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Question not found' });
  res.json(r.rows[0]);
}

async function deleteQuestion(req, res) {
  await db.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
  res.status(204).end();
}

// ---------- Exams ----------
async function listExams(req, res) {
  const r = await db.query(
    `SELECT e.*, COUNT(eq.question_id) AS question_count
     FROM exams e LEFT JOIN exam_questions eq ON eq.exam_id = e.id
     GROUP BY e.id ORDER BY e.id DESC`
  );
  res.json(r.rows);
}

async function createExam(req, res) {
  const { title, description, duration_min, max_violations, question_ids } = req.body;
  if (!title || !Array.isArray(question_ids) || !question_ids.length) {
    return res.status(400).json({ error: 'title and a non-empty question_ids array are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const examResult = await client.query(
      `INSERT INTO exams (title, description, duration_min, max_violations, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description || null, duration_min || 60, max_violations || 5, req.user.id]
    );
    const exam = examResult.rows[0];

    let seq = 0;
    for (const qid of question_ids) {
      await client.query(
        'INSERT INTO exam_questions (exam_id, question_id, seq) VALUES ($1,$2,$3)',
        [exam.id, qid, seq++]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(exam);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create exam' });
  } finally {
    client.release();
  }
}

async function updateExamStatus(req, res) {
  const { is_active } = req.body;
  const r = await db.query(
    'UPDATE exams SET is_active = $1 WHERE id = $2 RETURNING *',
    [!!is_active, req.params.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Exam not found' });
  res.json(r.rows[0]);
}

async function deleteExam(req, res) {
  await db.query('DELETE FROM exams WHERE id = $1', [req.params.id]);
  res.status(204).end();
}

// ---------- Results & Violations ----------
async function examResults(req, res) {
  const r = await db.query(
    `SELECT a.id AS attempt_id, u.name AS candidate_name, u.email,
            a.status, a.total_score, a.started_at, a.submitted_at,
            (SELECT COUNT(*) FROM violations v WHERE v.attempt_id = a.id) AS violation_count
     FROM exam_attempts a JOIN users u ON u.id = a.candidate_id
     WHERE a.exam_id = $1 ORDER BY a.started_at DESC`,
    [req.params.examId]
  );
  res.json(r.rows);
}

async function attemptDetail(req, res) {
  const attempt = await db.query('SELECT * FROM exam_attempts WHERE id = $1', [req.params.attemptId]);
  if (!attempt.rows.length) return res.status(404).json({ error: 'Attempt not found' });

  const submissions = await db.query(
    `SELECT s.*, q.title, q.type, q.points
     FROM submissions s JOIN questions q ON q.id = s.question_id
     WHERE s.attempt_id = $1 ORDER BY q.id`,
    [req.params.attemptId]
  );
  const violations = await db.query(
    'SELECT * FROM violations WHERE attempt_id = $1 ORDER BY occurred_at',
    [req.params.attemptId]
  );

  res.json({ attempt: attempt.rows[0], submissions: submissions.rows, violations: violations.rows });
}

async function allViolations(req, res) {
  const r = await db.query(
    `SELECT v.*, a.exam_id, u.name AS candidate_name, e.title AS exam_title
     FROM violations v
     JOIN exam_attempts a ON a.id = v.attempt_id
     JOIN users u ON u.id = a.candidate_id
     JOIN exams e ON e.id = a.exam_id
     ORDER BY v.occurred_at DESC LIMIT 500`
  );
  res.json(r.rows);
}

module.exports = {
  listTopics,
  listQuestions, getQuestion, createQuestion, updateQuestion, deleteQuestion,
  listExams, createExam, updateExamStatus, deleteExam,
  examResults, attemptDetail, allViolations
};
