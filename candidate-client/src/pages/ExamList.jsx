import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, setToken, setUser } from '../api';

const STATUS_LABEL = {
  in_progress: 'Resume attempt',
  submitted: 'Completed',
  auto_submitted: 'Auto-submitted',
  terminated: 'Terminated'
};

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const user = getUser();
  const nav = useNavigate();

  useEffect(() => {
    api.listExams().then(setExams).catch((e) => setError(e.message));
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
    nav('/login');
  }

  async function handleStart(examId) {
    setError('');
    try {
      const data = await api.startExam(examId);
      nav(`/exam-room/${examId}`, { state: data });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">Assessment <span>Portal</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{user?.name}</span>
          <button className="btn btn-outline" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="exam-grid">
        <h2 style={{ marginBottom: 0 }}>Your assessments</h2>
        {error && <div className="error-box">{error}</div>}
        {!exams.length && <p style={{ color: 'var(--text-dim)' }}>No assessments have been assigned yet.</p>}

        {exams.map((exam) => {
          const done = exam.attempt_status && exam.attempt_status !== 'in_progress';
          return (
            <div className="exam-card" key={exam.id}>
              <div>
                <h3>{exam.title}</h3>
                <p>{exam.description}</p>
                <div className="exam-meta">
                  {exam.question_count} questions · {exam.duration_min} min
                  {exam.attempt_status && (
                    <> · <span className="status-pill">{STATUS_LABEL[exam.attempt_status]}</span></>
                  )}
                </div>
              </div>
              <button
                className="btn btn-accent"
                disabled={done}
                onClick={() => handleStart(exam.id)}
              >
                {exam.attempt_status === 'in_progress' ? 'Resume' : done ? 'Completed' : 'Start'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
