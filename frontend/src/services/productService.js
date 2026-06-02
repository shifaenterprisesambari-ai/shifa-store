import api from './api';

export const productService = {
  getCategories: () => api.get('/categories'),
  getProductsByCategory: (categoryId) => api.get(`/products/${categoryId}`),
  getStores: () => api.get('/stores'),
  getStoreProducts: (branchId) => api.get(`/stores/${branchId}/products`),
};
