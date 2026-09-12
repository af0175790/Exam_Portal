const path = require('path');
const { runChildProcess } = require('./execHelper');
const { withLimit } = require('./concurrencyLimit');

const WORKER_PATH = path.join(__dirname, 'sqlWorker.js');

async function runOnce(schemaSetup, candidateQuery, timeoutMs) {
  const result = await withLimit(() => runChildProcess({
    command: process.execPath,
    args: [WORKER_PATH],
    input: JSON.stringify({ schemaSetup, candidateQuery }),
    timeoutMs,
    maxBuffer: 5 * 1024 * 1024
  }));

  if (!result.ok) return result;

  try {
    return JSON.parse(result.stdout);
  } catch (err) {
    return { ok: false, error: 'Failed to parse sandbox output' };
  }
}

function normalizeRows(rows) {
  // JSON round-trips undefined -> null already; keep as-is for comparison.
  return rows.map((r) => r.map((v) => (v === undefined ? null : v)));
}

function rowsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sortedRowsEqual(a, b) {
  const sa = a.map((r) => JSON.stringify(r)).sort();
  const sb = b.map((r) => JSON.stringify(r)).sort();
  return JSON.stringify(sa) === JSON.stringify(sb);
}

/**
 * Grades a candidate SQL submission against a question's test cases.
 * @param {object} question - row from `questions` table (schema_setup, test_cases, time_limit_ms)
 * @param {string} candidateQuery
 */
async function gradeSqlSubmission(question, candidateQuery) {
  const testCases = question.test_cases || [];
  const timeoutMs = question.time_limit_ms || 5000;
  let passed = 0;
  const results = [];

  for (const tc of testCases) {
    const result = await runOnce(question.schema_setup, candidateQuery, timeoutMs);
    if (!result.ok) {
      results.push({ passed: false, error: result.error });
      continue;
    }
    const actual = normalizeRows(result.rows);
    const expected = tc.expected_output || [];
    const isMatch = tc.ordered ? rowsEqual(actual, expected) : sortedRowsEqual(actual, expected);
    if (isMatch) passed += 1;
    results.push({ passed: isMatch, actual, expected: tc.ordered ? undefined : expected });
  }

  return {
    passedCases: passed,
    totalCases: testCases.length,
    score: testCases.length ? Math.round((passed / testCases.length) * question.points) : 0,
    results
  };
}

module.exports = { gradeSqlSubmission };