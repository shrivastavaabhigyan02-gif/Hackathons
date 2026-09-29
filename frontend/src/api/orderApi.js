import api from './client';

export const orderApi = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrder: (id) => api.get(`/orders/${id}`),
  getByOrderNumber: (orderNumber) => api.get(`/orders/number/${orderNumber}`),
  getMyOrders: () => api.get('/orders/my-orders'),
  cancelOrder: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
  reorder: (id) => api.get(`/orders/${id}/reorder`),
  getTracking: (orderId) => api.get(`/tracking/${orderId}`),
  simulateMove: (orderId) => api.post(`/tracking/${orderId}/simulate-move`),
  initiatePayment: (orderId, paymentMethod) => api.post('/payments/initiate', { orderId, paymentMethod }),
  verifyPayment: (orderId, paymentId, transactionId, status) => api.post('/payments/verify', { orderId, paymentId, transactionId, status })
};
