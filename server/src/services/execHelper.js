const { spawn } = require('child_process');

/**
 * Runs a child process asynchronously (non-blocking), writing `input` to its
 * stdin and collecting stdout/stderr, enforcing a hard timeout and a max
 * output size.
 *
 * Unlike execFileSync, this NEVER blocks Node's single-threaded event loop —
 * other candidates' requests (logins, page loads, other Run/Submit clicks)
 * keep being served normally while this awaits the process in the
 * background. This is the key fix for handling many concurrent candidates.
 */
function runChildProcess({ command, args = [], input = '', timeoutMs = 5000, maxBuffer = 2 * 1024 * 1024, env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish({ ok: false, error: `Execution timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }

    child.stdout.on('data', (d) => {
      stdout += d;
      if (stdout.length > maxBuffer) {
        child.kill('SIGTERM');
        finish({ ok: false, error: 'Output exceeded size limit' });
      }
    });

    child.stderr.on('data', (d) => { stderr += d; });

    child.on('error', (err) => finish({ ok: false, error: err.message }));

    child.on('close', (code, signal) => {
      if (signal === 'SIGTERM') {
        finish({ ok: false, error: `Execution timed out after ${timeoutMs}ms` });
      } else if (code !== 0) {
        finish({ ok: false, error: (stderr || `Process exited with code ${code}`).slice(0, 2000) });
      } else {
        finish({ ok: true, stdout });
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

module.exports = { runChildProcess };