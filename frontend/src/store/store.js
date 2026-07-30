import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import wishlistReducer from './wishlistSlice';
import notificationReducer from './notificationSlice';
import branchReducer from './branchSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    notifications: notificationReducer,
    branch: branchReducer,
  },
});

export default store;
