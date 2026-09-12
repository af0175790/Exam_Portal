const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() { return localStorage.getItem('admin_token'); }
export function setToken(token) {
  if (token) localStorage.setItem('admin_token', token);
  else localStorage.removeItem('admin_token');
}
export function getUser() {
  const raw = localStorage.getItem('admin_user');
  return raw ? JSON.parse(raw) : null;
}
export function setUser(user) {
  if (user) localStorage.setItem('admin_user', JSON.stringify(user));
  else localStorage.removeItem('admin_user');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body, e.g. 204 */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export const api = {
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),

  listTopics: () => request('/api/admin/topics'),

  listQuestions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/admin/questions${qs ? `?${qs}` : ''}`);
  },
  createQuestion: (payload) => request('/api/admin/questions', { method: 'POST', body: payload }),
  updateQuestion: (id, payload) => request(`/api/admin/questions/${id}`, { method: 'PUT', body: payload }),
  deleteQuestion: (id) => request(`/api/admin/questions/${id}`, { method: 'DELETE' }),

  listExams: () => request('/api/admin/exams'),
  createExam: (payload) => request('/api/admin/exams', { method: 'POST', body: payload }),
  setExamStatus: (id, is_active) => request(`/api/admin/exams/${id}/status`, { method: 'PATCH', body: { is_active } }),
  deleteExam: (id) => request(`/api/admin/exams/${id}`, { method: 'DELETE' }),

  examResults: (examId) => request(`/api/admin/exams/${examId}/results`),
  attemptDetail: (attemptId) => request(`/api/admin/attempts/${attemptId}`),
  allViolations: () => request('/api/admin/violations')
};
