import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function Results() {
  const { examId } = useParams();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.examResults(examId).then(setRows).catch((e) => setError(e.message));
  }, [examId]);

  async function openDetail(attemptId) {
    try {
      const data = await api.attemptDetail(attemptId);
      setDetail(data);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h1>Results</h1>
      <p className="page-sub">Candidate scores, status, and violation counts for this exam.</p>
      {error && <div className="error-box">{error}</div>}

      <table>
        <thead>
          <tr><th>Candidate</th><th>Status</th><th>Score</th><th>Violations</th><th>Started</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.attempt_id}>
              <td>{r.candidate_name}<div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{r.email}</div></td>
              <td><span className={`tag ${r.status === 'terminated' ? 'warn' : ''}`}>{r.status}</span></td>
              <td>{r.total_score}</td>
              <td>{r.violation_count > 0 ? <span className="tag warn">{r.violation_count}</span> : 0}</td>
              <td>{new Date(r.started_at).toLocaleString()}</td>
              <td><button className="btn btn-outline btn-sm" onClick={() => openDetail(r.attempt_id)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Attempt #{detail.attempt.id}</h2>
            <p className="page-sub">Status: {detail.attempt.status} · Score: {detail.attempt.total_score}</p>

            <h3>Submissions</h3>
            <table>
              <thead><tr><th>Question</th><th>Type</th><th>Passed</th><th>Score</th></tr></thead>
              <tbody>
                {detail.submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.title}</td>
                    <td><span className="tag">{s.type}</span></td>
                    <td>{s.passed_cases}/{s.total_cases}</td>
                    <td>{s.score}/{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ marginTop: 20 }}>Violations ({detail.violations.length})</h3>
            {!detail.violations.length && <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>None recorded.</p>}
            <table>
              <tbody>
                {detail.violations.map((v) => (
                  <tr key={v.id}>
                    <td><span className="tag warn">{v.type}</span></td>
                    <td>{new Date(v.occurred_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => setDetail(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
