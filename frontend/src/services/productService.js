import api from './api';

export const productService = {
  getCategories: () => api.get('/categories'),
  getProductsByCategory: (categoryId, branchId) => api.get(`/products/${categoryId}`, { params: branchId ? { branchId } : {} }),
  getStores: () => api.get('/stores'),
  getStoreProducts: (branchId) => api.get(`/stores/${branchId}/products`),
  getBranches: () => api.get('/branches'),
};
