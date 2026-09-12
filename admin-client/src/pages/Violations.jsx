import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Violations() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.allViolations().then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Violations</h1>
      <p className="page-sub">Latest 500 proctoring events across all exams.</p>
      {error && <div className="error-box">{error}</div>}

      <table>
        <thead>
          <tr><th>Candidate</th><th>Exam</th><th>Type</th><th>When</th></tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id}>
              <td>{v.candidate_name}</td>
              <td>{v.exam_title}</td>
              <td><span className="tag warn">{v.type}</span></td>
              <td>{new Date(v.occurred_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
