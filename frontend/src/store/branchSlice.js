import { createSlice } from '@reduxjs/toolkit';

const getInitialBranch = () => {
  try {
    const saved = localStorage.getItem('activeBranch');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const branchSlice = createSlice({
  name: 'branch',
  initialState: {
    activeBranch: getInitialBranch(),
    branches: [],
    loading: false,
  },
  reducers: {
    setBranch: (state, action) => {
      state.activeBranch = action.payload;
      try {
        if (action.payload) {
          localStorage.setItem('activeBranch', JSON.stringify(action.payload));
        } else {
          localStorage.removeItem('activeBranch');
        }
      } catch (e) {
        console.error(e);
      }
    },
    setBranches: (state, action) => {
      state.branches = action.payload;
    },
  },
});

export const { setBranch, setBranches } = branchSlice.actions;
export default branchSlice.reducer;
