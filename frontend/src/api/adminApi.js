import api from './client';

export const adminApi = {
  getStats: () => api.get('/admin/dashboard/stats'),
  getOrders: () => api.get('/admin/orders'),
  updateOrderStatus: (id, status, notes) => api.patch(`/admin/orders/${id}/status`, { status, notes }),
  addMenuItem: (itemData) => api.post('/admin/menu', itemData),
  updateMenuItem: (id, itemData) => api.put(`/admin/menu/${id}`, itemData),
  toggleItemAvailability: (id, is_available) => api.patch(`/admin/menu/${id}/availability`, { is_available }),
  deleteMenuItem: (id) => api.delete(`/admin/menu/${id}`),
  getReservations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/admin/reservations${qs ? `?${qs}` : ''}`);
  },
  updateReservationStatus: (id, status) => api.patch(`/admin/reservations/${id}/status`, { status }),
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (couponData) => api.post('/admin/coupons', couponData),
  toggleCoupon: (id, is_active) => api.patch(`/admin/coupons/${id}/toggle`, { is_active })
};
