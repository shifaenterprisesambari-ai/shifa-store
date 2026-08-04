import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_BRANCH = {
  _id: "6a4eb29042d2ac6fea33fc3f",
  name: "Ambari Branch",
  address: "Ambari, Assam, India",
  location: { latitude: 26.102074, longitude: 90.423017 }
};

const getInitialBranch = () => {
  try {
    const saved = localStorage.getItem('activeBranch');
    return saved ? JSON.parse(saved) : DEFAULT_BRANCH;
  } catch {
    return DEFAULT_BRANCH;
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
      state.activeBranch = action.payload || DEFAULT_BRANCH;
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
