import api from './client';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  getAddresses: () => api.get('/auth/addresses'),
  addAddress: (addressData) => api.post('/auth/addresses', addressData),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}`)
};
