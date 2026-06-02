import { createSlice } from '@reduxjs/toolkit';

const loadWishlist = () => {
  try {
    const w = localStorage.getItem('wishlist');
    return w ? JSON.parse(w) : [];
  } catch { return []; }
};
const saveWishlist = (items) => localStorage.setItem('wishlist', JSON.stringify(items));

/* [MOCK] — No backend wishlist API. Uses localStorage only. */
const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: loadWishlist() },
  reducers: {
    toggleWishlist: (state, action) => {
      const id = action.payload._id || action.payload.id;
      const idx = state.items.findIndex((i) => (i._id || i.id) === id);
      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        state.items.push(action.payload);
      }
      saveWishlist(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlist([]);
    },
  },
});

export const { toggleWishlist, clearWishlist } = wishlistSlice.actions;
export const selectWishlistItems = (state) => state.wishlist.items;
export const selectIsWishlisted = (id) => (state) =>
  state.wishlist.items.some((i) => (i._id || i.id) === id);
export default wishlistSlice.reducer;
