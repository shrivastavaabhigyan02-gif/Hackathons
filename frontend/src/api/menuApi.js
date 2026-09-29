import api from './client';

export const menuApi = {
  getCategories: () => api.get('/menu/categories'),
  getItems: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return api.get(`/menu/items${qs ? `?${qs}` : ''}`);
  },
  getItemBySlug: (slug) => api.get(`/menu/item/slug/${slug}`),
  getItemById: (id) => api.get(`/menu/item/${id}`)
};
