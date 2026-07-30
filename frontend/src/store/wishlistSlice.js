import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { wishlistService } from '../services/wishlistService';

const loadWishlistFromStorage = () => {
  try {
    const w = localStorage.getItem('wishlist');
    return w ? JSON.parse(w) : [];
  } catch {
    return [];
  }
};

const saveWishlistToStorage = (items) => {
  try {
    localStorage.setItem('wishlist', JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save wishlist to localStorage', e);
  }
};

// Async thunk to fetch customer's wishlist from backend
export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const response = await wishlistService.getWishlist();
      return response.data.wishlist || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wishlist');
    }
  }
);

// Async thunk to toggle wishlist item on backend with optimistic update
export const toggleWishlistAsync = createAsyncThunk(
  'wishlist/toggleWishlistAsync',
  async (product, { getState, rejectWithValue }) => {
    try {
      const productId = product._id || product.id;
      const response = await wishlistService.toggleWishlistItem(productId);
      return response.data.wishlist || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle wishlist item');
    }
  }
);

// Async thunk to sync local guest wishlist with backend on login
export const syncWishlistAsync = createAsyncThunk(
  'wishlist/syncWishlistAsync',
  async (_, { getState, rejectWithValue }) => {
    try {
      const localItems = getState().wishlist.items || [];
      const productIds = localItems.map((i) => i._id || i.id).filter(Boolean);
      const response = await wishlistService.syncWishlist(productIds);
      return response.data.wishlist || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to sync wishlist');
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: loadWishlistFromStorage(),
    loading: false,
    error: null,
  },
  reducers: {
    toggleWishlist: (state, action) => {
      const product = action.payload;
      const id = product._id || product.id;
      const idx = state.items.findIndex((i) => (i._id || i.id) === id);
      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.push(product);
      }
      saveWishlistToStorage(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlistToStorage([]);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Wishlist
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        saveWishlistToStorage(action.payload);
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Toggle Wishlist Async
      .addCase(toggleWishlistAsync.fulfilled, (state, action) => {
        state.items = action.payload;
        saveWishlistToStorage(action.payload);
      })
      // Sync Wishlist Async
      .addCase(syncWishlistAsync.fulfilled, (state, action) => {
        state.items = action.payload;
        saveWishlistToStorage(action.payload);
      });
  },
});

export const { toggleWishlist, clearWishlist } = wishlistSlice.actions;
export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistLoading = (state) => state.wishlist.loading;
export const selectIsWishlisted = (id) => (state) =>
  state.wishlist.items.some((i) => (i._id || i.id) === id);

export default wishlistSlice.reducer;
