import api from './client';

export const reservationApi = {
  getSlots: (date) => api.get(`/reservations/slots?date=${date}`),
  create: (data) => api.post('/reservations', data),
  getMyReservations: () => api.get('/reservations/my-reservations')
};
