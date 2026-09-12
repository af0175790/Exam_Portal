import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = {
  id: null, topic_id: '', type: 'sql', difficulty: 'easy', title: '', statement: '',
  schema_setup: '', starter_code: '', test_cases: '[]', time_limit_ms: 5000, points: 10
};

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState(null); // null = modal closed
  const [error, setError] = useState('');

  function load() {
    api.listQuestions(filterType ? { type: filterType } : {}).then(setQuestions).catch((e) => setError(e.message));
  }

  useEffect(() => { api.listTopics().then(setTopics); }, []);
  useEffect(load, [filterType]);

  function openCreate() { setForm({ ...emptyForm }); setError(''); }
  function openEdit(q) {
    setForm({
      ...q,
      topic_id: q.topic_id || '',
      test_cases: JSON.stringify(q.test_cases, null, 2)
    });
    setError('');
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    let parsedTestCases;
    try {
      parsedTestCases = JSON.parse(form.test_cases);
      if (!Array.isArray(parsedTestCases)) throw new Error('must be a JSON array');
    } catch (err) {
      setError(`Test cases must be valid JSON: ${err.message}`);
      return;
    }

    const payload = {
      topic_id: form.topic_id || null,
      type: form.type,
      difficulty: form.difficulty,
      title: form.title,
      statement: form.statement,
      schema_setup: form.type === 'sql' ? form.schema_setup : null,
      starter_code: form.type === 'python' ? form.starter_code : null,
      test_cases: parsedTestCases,
      time_limit_ms: Number(form.time_limit_ms) || 5000,
      points: Number(form.points) || 10
    };

    try {
      if (form.id) await api.updateQuestion(form.id, payload);
      else await api.createQuestion(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    await api.deleteQuestion(id);
    load();
  }

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1>Question bank</h1>
          <p className="page-sub">SQL (joins, subqueries, CTE…) and Python (ETL, EDA) questions.</p>
        </div>
        <button className="btn btn-accent" onClick={openCreate}>New question</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <select className="input" style={{ width: 200 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="sql">SQL</option>
          <option value="python">Python</option>
        </select>
      </div>

      {error && !form && <div className="error-box">{error}</div>}

      <table>
        <thead>
          <tr><th>Title</th><th>Type</th><th>Topic</th><th>Difficulty</th><th>Points</th><th></th></tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q.id}>
              <td>{q.title}</td>
              <td><span className="tag">{q.type}</span></td>
              <td>{q.topic_name || '—'}</td>
              <td>{q.difficulty}</td>
              <td>{q.points}</td>
              <td>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(q)} style={{ marginRight: 6 }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(q.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{form.id ? 'Edit question' : 'New question'}</h2>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={save}>
              <div className="grid-2">
                <div className="field">
                  <label>Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="sql">SQL</option>
                    <option value="python">Python</option>
                  </select>
                </div>
                <div className="field">
                  <label>Topic</label>
                  <select className="input" value={form.topic_id} onChange={(e) => setForm({ ...form, topic_id: e.target.value })}>
                    <option value="">— none —</option>
                    {topics.filter((t) => t.category === form.type).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Difficulty</label>
                  <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="field">
                  <label>Points</label>
                  <input className="input" type="number" value={form.points}
                    onChange={(e) => setForm({ ...form, points: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label>Title</label>
                <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="field">
                <label>Statement</label>
                <textarea className="input" rows={4} required value={form.statement}
                  onChange={(e) => setForm({ ...form, statement: e.target.value })} />
              </div>

              {form.type === 'sql' ? (
                <div className="field">
                  <label>Sandbox schema (CREATE TABLE + INSERT — SQLite dialect)</label>
                  <textarea className="input" rows={6} value={form.schema_setup || ''}
                    onChange={(e) => setForm({ ...form, schema_setup: e.target.value })} />
                </div>
              ) : (
                <div className="field">
                  <label>Starter code shown to candidate</label>
                  <textarea className="input" rows={6} value={form.starter_code || ''}
                    onChange={(e) => setForm({ ...form, starter_code: e.target.value })} />
                </div>
              )}

              <div className="field">
                <label>
                  Test cases (JSON array)
                  {form.type === 'sql'
                    ? ' — [{"ordered": true, "expected_output": [[...]]}]'
                    : ' — [{"input": "stdin text", "expected_output": "expected stdout"}]'}
                </label>
                <textarea className="input" rows={6} value={form.test_cases}
                  onChange={(e) => setForm({ ...form, test_cases: e.target.value })} />
              </div>

              <div className="field">
                <label>Time limit (ms)</label>
                <input className="input" type="number" value={form.time_limit_ms}
                  onChange={(e) => setForm({ ...form, time_limit_ms: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn btn-accent" type="submit">Save</button>
                <button className="btn btn-outline" type="button" onClick={() => setForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
