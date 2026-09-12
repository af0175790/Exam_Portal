// Caps how many CPU-heavy child-process executions (Python/SQL grading) run
// at the same time, regardless of how many HTTP requests arrive at once.
// This keeps the server responsive when many candidates click "Run tests"
// simultaneously — extra requests wait briefly in an in-memory queue instead
// of spawning unlimited OS processes all at once and starving the machine.
//
// Tune with the MAX_CONCURRENT_EXECUTIONS env var. Defaults to the number of
// CPU cores (minimum 2), which is a reasonable starting point for a small
// Render/VM instance.

const os = require('os');

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS, 10)
  || Math.max(2, os.cpus().length);

let active = 0;
const queue = [];

function acquire() {
  return new Promise((resolve) => {
    const tryRun = () => {
      if (active < MAX_CONCURRENT) {
        active += 1;
        resolve(release);
      } else {
        queue.push(tryRun);
      }
    };
    tryRun();
  });
}

function release() {
  active -= 1;
  const next = queue.shift();
  if (next) next();
}

async function withLimit(fn) {
  const done = await acquire();
  try {
    return await fn();
  } finally {
    done();
  }
}

module.exports = { withLimit, MAX_CONCURRENT };