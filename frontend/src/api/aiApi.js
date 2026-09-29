import api from './client';

export const aiApi = {
  ask: (query, session_id) => api.post('/ai/ask', { query, session_id })
};
