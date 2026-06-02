import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    isOpen: false,
  },
  reducers: {
    setNotifications: (state, action) => {
      state.items = action.payload.notifications || [];
      state.unreadCount = action.payload.unreadCount || 0;
    },
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    markRead: (state, action) => {
      const n = state.items.find((i) => i._id === action.payload);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead: (state) => {
      state.items.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    },
    toggleNotifications: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

export const { setNotifications, addNotification, markRead, markAllRead, toggleNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
