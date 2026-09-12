-- ===================================================================
-- SQL & Python Exam Portal — PostgreSQL Schema
-- ===================================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'candidate')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Topics let questions be grouped (Joins, Subqueries, CTE, ETL, EDA, etc.)
CREATE TABLE IF NOT EXISTS topics (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(80) UNIQUE NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('sql', 'python'))
);

-- Questions bank
CREATE TABLE IF NOT EXISTS questions (
  id              SERIAL PRIMARY KEY,
  topic_id        INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('sql', 'python')),
  difficulty      VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  title           VARCHAR(200) NOT NULL,
  statement       TEXT NOT NULL,          -- the question text / problem statement
  schema_setup    TEXT,                   -- SQL: CREATE TABLE + INSERT statements to build the sandbox DB
  starter_code    TEXT,                   -- Python: starter code shown to candidate
  test_cases      JSONB NOT NULL,         -- array of {input, expected_output} used to grade the submission
  time_limit_ms   INTEGER DEFAULT 5000,   -- execution time limit per run
  points          INTEGER DEFAULT 10,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exams (a paper made of several questions)
CREATE TABLE IF NOT EXISTS exams (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  duration_min  INTEGER NOT NULL DEFAULT 60,
  max_violations INTEGER NOT NULL DEFAULT 5, -- auto-submit threshold
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_questions (
  exam_id     INTEGER REFERENCES exams(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  seq         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exam_id, question_id)
);

-- An attempt = one candidate taking one exam once
CREATE TABLE IF NOT EXISTS exam_attempts (
  id            SERIAL PRIMARY KEY,
  exam_id       INTEGER REFERENCES exams(id) ON DELETE CASCADE,
  candidate_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at  TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'terminated')),
  total_score   INTEGER DEFAULT 0,
  ip_address    VARCHAR(64),
  user_agent    TEXT,
  UNIQUE (exam_id, candidate_id)
);

-- Candidate's saved/submitted code per question within an attempt
CREATE TABLE IF NOT EXISTS submissions (
  id            SERIAL PRIMARY KEY,
  attempt_id    INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id   INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  code          TEXT,
  passed_cases  INTEGER DEFAULT 0,
  total_cases   INTEGER DEFAULT 0,
  score         INTEGER DEFAULT 0,
  last_run_at   TIMESTAMPTZ,
  UNIQUE (attempt_id, question_id)
);

-- Proctoring / violation log
CREATE TABLE IF NOT EXISTS violations (
  id            SERIAL PRIMARY KEY,
  attempt_id    INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE,
  type          VARCHAR(40) NOT NULL, -- tab_switch, copy, paste, right_click, fullscreen_exit, dev_tools
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta          JSONB
);

CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_violations_attempt ON violations(attempt_id);
CREATE INDEX IF NOT EXISTS idx_submissions_attempt ON submissions(attempt_id);