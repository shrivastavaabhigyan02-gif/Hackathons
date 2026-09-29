const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiRequest(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
  const token = localStorage.getItem('ff_auth_token');
  const sessionId = localStorage.getItem('ff_session_id') || ('sess_' + Math.random().toString(36).substring(2, 9));
  if (!localStorage.getItem('ff_session_id')) {
    localStorage.setItem('ff_session_id', sessionId);
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-session-id': sessionId,
    ...headers
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: defaultHeaders
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.code = data.code;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (!navigator.onLine) {
      const offlineErr = new Error("You're currently offline. Please check your internet connection.");
      offlineErr.code = 'NETWORK_OFFLINE';
      throw offlineErr;
    }
    throw err;
  }
}

export const api = {
  get: (endpoint, headers) => apiRequest(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers) => apiRequest(endpoint, { method: 'POST', body, headers }),
  put: (endpoint, body, headers) => apiRequest(endpoint, { method: 'PUT', body, headers }),
  patch: (endpoint, body, headers) => apiRequest(endpoint, { method: 'PATCH', body, headers }),
  delete: (endpoint, headers) => apiRequest(endpoint, { method: 'DELETE', headers })
};

export default api;
