const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { runChildProcess } = require('./execHelper');
const { withLimit } = require('./concurrencyLimit');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

async function runOnce(code, input, timeoutMs) {
  const tmpFile = path.join(os.tmpdir(), `submission-${crypto.randomUUID()}.py`);
  fs.writeFileSync(tmpFile, code, 'utf8');

  try {
    const result = await withLimit(() => runChildProcess({
      command: PYTHON_BIN,
      args: ['-I', tmpFile],
      input: input || '',
      timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
      env: { PATH: process.env.PATH } // strip secrets/env vars, keep PATH so the interpreter resolves
    }));
    return result;
  } finally {
    fs.unlink(tmpFile, () => {});
  }
}

/**
 * Grades a candidate Python submission against a question's test cases.
 * @param {object} question - row from `questions` table (test_cases, time_limit_ms)
 * @param {string} candidateCode
 */
async function gradePythonSubmission(question, candidateCode) {
  const testCases = question.test_cases || [];
  const timeoutMs = question.time_limit_ms || 5000;
  let passed = 0;
  const results = [];

  for (const tc of testCases) {
    const result = await runOnce(candidateCode, tc.input, timeoutMs);
    if (!result.ok) {
      results.push({ passed: false, error: result.error });
      continue;
    }
    const actual = result.stdout.replace(/\r\n/g, '\n').trim();
    const expected = (tc.expected_output || '').replace(/\r\n/g, '\n').trim();
    const isMatch = actual === expected;
    if (isMatch) passed += 1;
    results.push({ passed: isMatch, actual, expected });
  }

  return {
    passedCases: passed,
    totalCases: testCases.length,
    score: testCases.length ? Math.round((passed / testCases.length) * question.points) : 0,
    results
  };
}

module.exports = { gradePythonSubmission };