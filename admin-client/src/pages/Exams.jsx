import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const emptyForm = { title: '', description: '', duration_min: 60, max_violations: 5, question_ids: [] };

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  function load() { api.listExams().then(setExams).catch((e) => setError(e.message)); }
  useEffect(load, []);
  useEffect(() => { api.listQuestions().then(setQuestions); }, []);

  function openCreate() { setForm({ ...emptyForm }); setError(''); }

  function toggleQuestion(id) {
    setForm((f) => ({
      ...f,
      question_ids: f.question_ids.includes(id)
        ? f.question_ids.filter((q) => q !== id)
        : [...f.question_ids, id]
    }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!form.question_ids.length) { setError('Select at least one question.'); return; }
    try {
      await api.createExam({
        ...form,
        duration_min: Number(form.duration_min),
        max_violations: Number(form.max_violations)
      });
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(exam) {
    await api.setExamStatus(exam.id, !exam.is_active);
    load();
  }

  async function remove(id) {
    if (!window.confirm('Delete this exam and all its attempts/results?')) return;
    await api.deleteExam(id);
    load();
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1>Exams</h1>
          <p className="page-sub">Assemble exams from the question bank and monitor candidate results.</p>
        </div>
        <button className="btn btn-accent" onClick={openCreate}>New exam</button>
      </div>

      {error && !form && <div className="error-box">{error}</div>}

      <table>
        <thead>
          <tr><th>Title</th><th>Questions</th><th>Duration</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {exams.map((exam) => (
            <tr key={exam.id}>
              <td>{exam.title}</td>
              <td>{exam.question_count}</td>
              <td>{exam.duration_min} min</td>
              <td><span className={`tag ${exam.is_active ? '' : 'warn'}`}>{exam.is_active ? 'active' : 'inactive'}</span></td>
              <td>
                <Link className="btn btn-outline btn-sm" to={`/exams/${exam.id}/results`} style={{ marginRight: 6 }}>Results</Link>
                <button className="btn btn-outline btn-sm" onClick={() => toggleActive(exam)} style={{ marginRight: 6 }}>
                  {exam.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(exam.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>New exam</h2>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={save}>
              <div className="field">
                <label>Title</label>
                <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Duration (minutes)</label>
                  <input className="input" type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
                </div>
                <div className="field">
                  <label>Max violations before auto-submit</label>
                  <input className="input" type="number" value={form.max_violations} onChange={(e) => setForm({ ...form, max_violations: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Questions ({form.question_ids.length} selected)</label>
                <div className="checkbox-list">
                  {questions.map((q) => (
                    <label className="checkbox-row" key={q.id}>
                      <input type="checkbox" checked={form.question_ids.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                      <span className="tag">{q.type}</span> {q.title}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn btn-accent" type="submit">Create exam</button>
                <button className="btn btn-outline" type="button" onClick={() => setForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
