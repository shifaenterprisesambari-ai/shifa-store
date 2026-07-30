import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/authService';

export const fetchUser = createAsyncThunk('auth/fetchUser', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authService.fetchUser();
    return data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
  }
});

const getInitialToken = (type) => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  let role = 'Customer';
  if (path.startsWith('/shop')) role = 'ShopOwner';
  else if (path.startsWith('/delivery')) role = 'DeliveryPartner';
  else if (path.startsWith('/admin')) role = 'Admin';

  return localStorage.getItem(`${type}_${role}`) || localStorage.getItem(type) || null;
};

const initialState = {
  user: null,
  accessToken: getInitialToken('accessToken'),
  refreshToken: getInitialToken('refreshToken'),
  isAuthenticated: !!getInitialToken('accessToken'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      if (user?.role) {
        localStorage.setItem(`accessToken_${user.role}`, accessToken);
        localStorage.setItem(`refreshToken_${user.role}`, refreshToken);
      }
    },
    logout: (state) => {
      const role = state.user?.role;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (role) {
        localStorage.removeItem(`accessToken_${role}`);
        localStorage.removeItem(`refreshToken_${role}`);
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.loading = true; })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });
  },
});

export const { loginSuccess, logout, setLoading, setError, updateProfile, clearError } = authSlice.actions;
export default authSlice.reducer;
