const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('candidate_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('candidate_token', token);
  else localStorage.removeItem('candidate_token');
}

export function getUser() {
  const raw = localStorage.getItem('candidate_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  if (user) localStorage.setItem('candidate_user', JSON.stringify(user));
  else localStorage.removeItem('candidate_user');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),

  listExams: () => request('/api/candidate/exams'),
  startExam: (examId) => request(`/api/candidate/exams/${examId}/start`, { method: 'POST' }),
  runCode: (attemptId, questionId, code) =>
    request(`/api/candidate/attempts/${attemptId}/questions/${questionId}/run`, { method: 'POST', body: { code } }),
  submitAttempt: (attemptId, reason) =>
    request(`/api/candidate/attempts/${attemptId}/submit`, { method: 'POST', body: { reason } }),
  logViolation: (attemptId, type, meta) =>
    request(`/api/candidate/attempts/${attemptId}/violations`, { method: 'POST', body: { type, meta } }),
  getResult: (attemptId) => request(`/api/candidate/attempts/${attemptId}/result`)
};
