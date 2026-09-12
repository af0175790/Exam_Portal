// Runs in its own child process (spawned by sqlRunner.js) so that a bad/slow
// query can be killed with a hard timeout without touching the main server.
//
// stdin  (JSON): { schemaSetup: string, candidateQuery: string }
// stdout (JSON): { ok: true, rows: [[...], ...] } | { ok: false, error: string }

const Database = require('better-sqlite3');

function readStdin() {
  const chunks = [];
  process.stdin.on('data', (c) => chunks.push(c));
  return new Promise((resolve) => {
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

const BLOCKED_PATTERN = /\b(attach|detach|pragma|vacuum|drop\s+table|drop\s+database)\b/i;

(async () => {
  try {
    const raw = await readStdin();
    const { schemaSetup, candidateQuery } = JSON.parse(raw);

    if (!candidateQuery || !candidateQuery.trim()) {
      throw new Error('Empty query submitted');
    }
    if (BLOCKED_PATTERN.test(candidateQuery)) {
      throw new Error('Query contains a disallowed statement');
    }

    const db = new Database(':memory:');
    db.pragma('journal_mode = MEMORY');

    if (schemaSetup) {
      db.exec(schemaSetup);
    }

    // Only allow a single SELECT / WITH statement from the candidate.
    const trimmed = candidateQuery.trim().replace(/;\s*$/, '');
    if (/;/.test(trimmed)) {
      throw new Error('Only a single statement is allowed');
    }
    if (!/^(select|with)\b/i.test(trimmed)) {
      throw new Error('Only SELECT / WITH queries are allowed');
    }

    const stmt = db.prepare(trimmed);
    const rows = stmt.raw().all();
    db.close();

    process.stdout.write(JSON.stringify({ ok: true, rows }));
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err.message }));
  }
})();
