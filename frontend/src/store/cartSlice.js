import { createSlice } from '@reduxjs/toolkit';

const loadCart = () => {
  try {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  } catch { return []; }
};

const saveCart = (items) => {
  localStorage.setItem('cart', JSON.stringify(items));
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadCart(),
    isOpen: false,
  },
  reducers: {
    addToCart: (state, action) => {
      const product = action.payload;
      const existing = state.items.find((i) => i._id === product._id);
      if (existing) {
        existing.count += 1;
      } else {
        state.items.push({ ...product, count: 1 });
      }
      saveCart(state.items);
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((i) => i._id !== action.payload);
      saveCart(state.items);
    },
    incrementQty: (state, action) => {
      const item = state.items.find((i) => i._id === action.payload);
      if (item) item.count += 1;
      saveCart(state.items);
    },
    decrementQty: (state, action) => {
      const item = state.items.find((i) => i._id === action.payload);
      if (item) {
        item.count -= 1;
        if (item.count <= 0) {
          state.items = state.items.filter((i) => i._id !== action.payload);
        }
      }
      saveCart(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      saveCart(state.items);
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    setCartOpen: (state, action) => {
      state.isOpen = action.payload;
    },
  },
});

export const { addToCart, removeFromCart, incrementQty, decrementQty, clearCart, toggleCart, setCartOpen } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) => state.cart.items.reduce((sum, i) => sum + i.count, 0);
export const selectCartTotal = (state) => state.cart.items.reduce((sum, i) => sum + i.price * i.count, 0);
export const selectCartSavings = (state) =>
  state.cart.items.reduce((sum, i) => sum + ((i.discountPrice || i.price) - i.price) * i.count, 0);

export default cartSlice.reducer;
