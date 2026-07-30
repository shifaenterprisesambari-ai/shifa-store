import api from './api';

export const wishlistService = {
  getWishlist: () => api.get('/customer/wishlist'),
  toggleWishlistItem: (productId) => api.post('/customer/wishlist/toggle', { productId }),
  syncWishlist: (productIds) => api.post('/customer/wishlist/sync', { productIds }),
};

export default wishlistService;
