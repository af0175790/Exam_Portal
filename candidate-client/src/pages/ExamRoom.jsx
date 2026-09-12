import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useViolationMonitor, enterFullscreen } from '../hooks/useViolationMonitor';

function formatTime(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function ExamRoom() {
  const { examId } = useParams();
  const nav = useNavigate();

  const [loadState, setLoadState] = useState({ loading: true, error: '' });
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [codeByQuestion, setCodeByQuestion] = useState({});
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [finished, setFinished] = useState(null); // { status } once done
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.startExam(examId)
      .then((data) => {
        if (cancelled) return;
        setExam(data.exam);
        setAttempt(data.attempt);
        setQuestions(data.questions);
        const initialCode = {};
        data.questions.forEach((q) => {
          initialCode[q.id] = q.saved?.code ?? q.starter_code ?? '';
        });
        setCodeByQuestion(initialCode);
        setTimeLeftMs(new Date(data.attempt.deadline).getTime() - Date.now());
        setLoadState({ loading: false, error: '' });
        enterFullscreen();
      })
      .catch((e) => setLoadState({ loading: false, error: e.message }));
    return () => { cancelled = true; };
  }, [examId]);

  const activeQuestion = questions[activeIdx];

  const doSubmit = async (reason) => {
    if (submittingRef.current || !attempt) return;
    submittingRef.current = true;
    try {
      const result = await api.submitAttempt(attempt.id, reason);
      setFinished(result);
    } catch (e) {
      setLoadState((s) => ({ ...s, error: e.message }));
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!attempt || finished) return undefined;
    const id = setInterval(() => {
      setTimeLeftMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(id);
          doSubmit('auto');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [attempt, finished]);

  const handleViolation = async (type, meta) => {
    if (!attempt || finished) return;
    try {
      const res = await api.logViolation(attempt.id, type, meta);
      setViolationCount(res.violationCount);
      if (res.autoSubmitted) {
        setFinished({ status: 'terminated' });
      }
    } catch {
      // if attempt already finalized server-side, ignore
    }
  };

  useViolationMonitor(!!attempt && !finished, handleViolation);

  async function handleRun() {
    if (!activeQuestion) return;
    setRunning(true);
    setRunResult(null);
    try {
      const result = await api.runCode(attempt.id, activeQuestion.id, codeByQuestion[activeQuestion.id] || '');
      setRunResult(result);
      setQuestions((qs) => qs.map((q) => (q.id === activeQuestion.id
        ? { ...q, saved: { passed_cases: result.passedCases, total_cases: result.totalCases, score: result.score } }
        : q)));
    } catch (e) {
      setRunResult({ error: e.message });
    } finally {
      setRunning(false);
    }
  }

  const totalScore = useMemo(
    () => questions.reduce((sum, q) => sum + (q.saved?.score || 0), 0),
    [questions]
  );
  const maxScore = useMemo(() => questions.reduce((sum, q) => sum + q.points, 0), [questions]);

  if (loadState.loading) return <div className="center-msg">Loading assessment…</div>;
  if (loadState.error) return <div className="center-msg">{loadState.error}</div>;

  if (finished) {
    return (
      <div className="auth-shell">
        <div className="card auth-card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 className="auth-title">
            {finished.status === 'terminated' ? 'Assessment terminated' : 'Assessment submitted'}
          </h1>
          <p className="auth-sub">
            {finished.status === 'terminated'
              ? 'This attempt was ended automatically because the violation limit was reached.'
              : 'Your answers have been recorded.'}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, marginBottom: 20 }}>
            Score so far: {totalScore} / {maxScore}
          </p>
          <button className="btn btn-accent" onClick={() => nav('/exams')}>Back to assessments</button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-room">
      <div className="exam-header">
        <div>{exam.title}</div>
        <div className={`timer ${timeLeftMs < 60000 ? 'low' : ''}`}>{formatTime(timeLeftMs)}</div>
        <div>
          {violationCount > 0 && (
            <span className="violation-badge">
              Violations: {violationCount}/{exam.max_violations}
            </span>
          )}
        </div>
      </div>

      <div className="exam-body">
        <div className="question-nav">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`question-nav-item ${i === activeIdx ? 'active' : ''}`}
              onClick={() => { setActiveIdx(i); setRunResult(null); }}
            >
              <span className="q-tag">Q{i + 1} · {q.type.toUpperCase()}</span>
              {q.saved && <span className="q-status">{q.saved.passed_cases}/{q.saved.total_cases}</span>}
              <div>{q.title}</div>
            </div>
          ))}
        </div>

        {activeQuestion && (
          <>
            <div className="editor-panel">
              <div className="editor-toolbar">
                <button className="btn btn-run" onClick={handleRun} disabled={running}>
                  {running ? 'Running…' : 'Run tests'}
                </button>
              </div>
              <textarea
                className="code-editor"
                spellCheck={false}
                value={codeByQuestion[activeQuestion.id] || ''}
                onChange={(e) => setCodeByQuestion((c) => ({ ...c, [activeQuestion.id]: e.target.value }))}
              />
              {runResult && (
                <div className="results-panel">
                  {runResult.error && <div className="fail">{runResult.error}</div>}
                  {!runResult.error && (
                    <>
                      <div className={runResult.passedCases === runResult.totalCases ? 'pass' : 'fail'}>
                        {runResult.passedCases} / {runResult.totalCases} test cases passed — score {runResult.score}
                      </div>
                      {runResult.results?.[0] && !runResult.results[0].passed && (
                        <div style={{ marginTop: 8 }}>
                          {runResult.results[0].error
                            ? <pre>{runResult.results[0].error}</pre>
                            : (
                              <>
                                <div>Expected:</div>
                                <pre>{JSON.stringify(runResult.results[0].expected)}</pre>
                                <div>Actual:</div>
                                <pre>{JSON.stringify(runResult.results[0].actual)}</pre>
                              </>
                            )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="statement-panel">
              <span className="diff-tag">{activeQuestion.difficulty} · {activeQuestion.points} pts</span>
              <h2>{activeQuestion.title}</h2>
              <p className="statement-text">{activeQuestion.statement}</p>
              {activeQuestion.schema_setup && (
                <>
                  <strong style={{ fontSize: 13 }}>Sandbox schema</strong>
                  <pre>{activeQuestion.schema_setup.trim()}</pre>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="submit-bar">
        <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 13, color: 'var(--text-dim)' }}>
          Score so far: {totalScore} / {maxScore}
        </span>
        <button
          className="btn btn-warn"
          onClick={() => {
            if (window.confirm('Submit the assessment now? You cannot make changes after this.')) {
              doSubmit('manual');
            }
          }}
        >
          Submit assessment
        </button>
      </div>
    </div>
  );
}
