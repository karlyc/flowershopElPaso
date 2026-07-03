// js/api.js — thin fetch wrapper: auth header injection, JSON handling, 401 redirect
const API_BASE = window.KAREL_API_BASE;

function getToken() {
  return localStorage.getItem('karel_token');
}
function setToken(token) {
  localStorage.setItem('karel_token', token);
}
function clearToken() {
  localStorage.removeItem('karel_token');
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, body });

  if (res.status === 401) {
    clearToken();
    localStorage.removeItem('karel_staff');
    location.hash = '#/login';
    throw new Error('Session expired — please sign in again');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export { getToken, setToken, clearToken, API_BASE };
