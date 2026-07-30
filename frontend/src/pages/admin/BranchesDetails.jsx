import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiShoppingBag, FiPackage, FiTruck,
  FiTrendingUp, FiDollarSign, FiRefreshCw,
  FiAlertCircle, FiCheckCircle, FiClock, FiXCircle
} from 'react-icons/fi';
import { MdStorefront, MdOutlineReceiptLong } from 'react-icons/md';
import { getAdminStats, getConfig, updateBranchCommission } from '../../services/adminService';
import { productService } from '../../services/productService';
import toast from 'react-hot-toast';

/* ── helpers ── */
const fmt = (n, decimals = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n ?? 0);

const fmtNum = (n) =>
  new Intl.NumberFormat('en-IN').format(n ?? 0);

const STATUS_META = {
  pending:        { label: 'Pending',         color: 'bg-amber-100  text-amber-700 border border-amber-200',  icon: FiClock },
  accepted:       { label: 'Accepted',        color: 'bg-blue-100   text-blue-700 border border-blue-200',   icon: FiCheckCircle },
  outForDelivery: { label: 'Out for Delivery',color: 'bg-purple-100 text-purple-700 border border-purple-200', icon: FiTruck },
  delivered:      { label: 'Delivered',       color: 'bg-emerald-100 text-emerald-700 border border-emerald-200',icon: FiCheckCircle },
  cancelled:      { label: 'Cancelled',       color: 'bg-red-100    text-red-700 border border-red-200',    icon: FiXCircle },
};

/* ── Status Badge ── */
const Badge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: 'bg-slate-100 text-slate-600 border border-slate-200', icon: FiPackage };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${m.color}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
};

/* ── KPI Card ── */
const KpiCard = ({ label, value, icon: Icon, colorTheme, sub, delay = 0 }) => {
  const themeMap = {
    indigo: { bg: 'bg-indigo-50 text-indigo-600', border: 'border-t-indigo-500' },
    emerald: { bg: 'bg-emerald-50 text-emerald-600', border: 'border-t-emerald-500' },
    cyan: { bg: 'bg-cyan-50 text-cyan-600', border: 'border-t-cyan-500' },
    violet: { bg: 'bg-violet-50 text-violet-600', border: 'border-t-violet-500' },
  };

  const theme = themeMap[colorTheme] || themeMap.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className={`relative overflow-hidden bg-white border border-slate-200 border-t-4 ${theme.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between h-28`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
          <p className="text-xl font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors duration-300">{value}</p>
        </div>
        <div className={`p-2 rounded-xl ${theme.bg} transition-transform duration-300 group-hover:scale-110 shrink-0`}>
          <Icon size={16} />
        </div>
      </div>
      {sub && <p className="text-[9px] text-slate-500 font-semibold mt-1 truncate bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 w-fit">{sub}</p>}
    </motion.div>
  );
};

const BranchesDetails = () => {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchStats, setBranchStats] = useState(null);
  const [config, setConfig] = useState({ rider_pay_per_km: 3.5, shop_commission_percentage: 10 });
  const [branchCommInput, setBranchCommInput] = useState('');

  useEffect(() => {
    if (branchStats?.branchInfo?.commissionPercentage !== undefined) {
      setBranchCommInput(String(branchStats.branchInfo.commissionPercentage));
    } else if (config?.shop_commission_percentage !== undefined) {
      setBranchCommInput(String(config.shop_commission_percentage));
    }
  }, [branchStats, config]);

  const handleSaveBranchCommission = async (e) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    try {
      const val = parseFloat(branchCommInput);
      if (isNaN(val) || val < 0 || val > 100) return toast.error('Commission percentage must be between 0 and 100');
      await updateBranchCommission({ branchId: selectedBranchId, commissionPercentage: val });
      toast.success(`Commission rate for this branch updated to ${val}%! 🎉`);
      loadBranchDetails(selectedBranchId, true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branch commission');
    }
  };

  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Re-route if user is a sub-branch admin
  useEffect(() => {
    if (user?.branch) {
      toast.error('Access restricted to master administrator.');
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  // Load branches list
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const { data } = await productService.getBranches();
        // Filter out "SHIFA STORE"
        const filtered = data.filter((b) => b.name?.toUpperCase() !== 'SHIFA STORE');
        setBranches(filtered);
        if (filtered.length > 0) {
          setSelectedBranchId(filtered[0]._id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load sub-branches list');
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  // Load stats and config when branch changes
  const loadBranchDetails = async (branchId, silent = false) => {
    if (!branchId) return;
    if (!silent) setLoadingStats(true);
    else setRefreshing(true);

    try {
      const [statsRes, configRes] = await Promise.all([
        getAdminStats({ branchId }),
        getConfig()
      ]);
      setBranchStats(statsRes.data);
      setConfig(configRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sub-branch operational intelligence');
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      loadBranchDetails(selectedBranchId);
    }
  }, [selectedBranchId]);

  if (loadingBranches) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <div className="w-9 h-9 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Locating Branches...</span>
      </div>
    );
  }

  const shopBreakdown = branchStats?.shopBreakdown || [];
  const recentOrders = branchStats?.recentOrders || [];
  const commissionPercentage = branchStats?.branchInfo?.commissionPercentage ?? config.shop_commission_percentage ?? 10;

  const kpis = branchStats ? [
    { label: 'Total Revenue',      value: fmt(branchStats.revenue?.total), icon: FiDollarSign, colorTheme: 'indigo', sub: `${branchStats.orders?.delivered || 0} delivered orders` },
    { label: 'Platform Commission', value: fmt(branchStats.revenue?.platformEarnings), icon: FiTrendingUp, colorTheme: 'emerald', sub: `${commissionPercentage}% platform cuts` },
    { label: 'Total Stores',       value: fmtNum(branchStats.users?.shopOwners), icon: MdStorefront, colorTheme: 'violet', sub: `${shopBreakdown.length} active stores` },
    { label: 'Active Riders',      value: fmtNum(branchStats.users?.deliveryPartners), icon: FiTruck, colorTheme: 'cyan', sub: 'Available for dispatch' },
  ] : [];

  return (
    <div className="w-full min-h-screen bg-slate-50 px-4 sm:px-8 pt-20 sm:pt-24 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header and Back Button */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <Link to="/admin/dashboard" className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer">
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-primary to-[#FF9A33] bg-clip-text text-transparent tracking-tight">
              📍 Sub-Branches Operational Intelligence
            </h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wide mt-0.5">
              Select any geographical sub-branch below to view its localized merchant and customer analytics
            </p>
          </div>
          {selectedBranchId && (
            <button onClick={() => loadBranchDetails(selectedBranchId, true)} disabled={refreshing || loadingStats}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer disabled:opacity-50">
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>

        {/* Branch Selector Dropdown & Commission Adjustment Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 max-w-md">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Active Sub-Branch</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none font-bold shadow-sm"
            >
              {branches.length === 0 ? (
                <option value="">No branches configured</option>
              ) : (
                branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    📍 {b.name} ({b.address})
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedBranchId && (
            <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl flex-1 max-w-md shadow-xs">
              <label className="text-xs font-bold text-indigo-950 uppercase tracking-wider block mb-1">
                ⚙️ Sub-Branch Commission Rate (% Platform Cut)
              </label>
              <p className="text-[11px] text-indigo-700 font-semibold mb-2">
                Decide the percentage of profit charged by the site owner for this sub-branch
              </p>
              <form onSubmit={handleSaveBranchCommission} className="flex gap-2.5 items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={branchCommInput}
                  onChange={(e) => setBranchCommInput(e.target.value)}
                  className="w-28 px-3 py-2 bg-white rounded-xl text-sm border border-indigo-200 text-indigo-950 font-black focus:outline-none shadow-xs"
                />
                <span className="text-xs font-bold text-indigo-900">%</span>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Branch Cut
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Operational Statistics Area */}
        <AnimatePresence mode="wait">
          {loadingStats ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full py-20 flex flex-col justify-center items-center gap-3"
            >
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gathering branch telemetry...</span>
            </motion.div>
          ) : branchStats ? (
            <motion.div
              key={selectedBranchId}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* KPIs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {kpis.map((k, i) => <KpiCard key={i} {...k} delay={i * 0.05} />)}
              </div>

              {/* Shop Owner breakdown specific to the selected branch */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
                <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <FiShoppingBag className="text-primary" /> Shop Owner Earnings Breakdown
                </h2>
                {shopBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8 font-medium">No shop data yet for this sub-branch.</p>
                ) : (
                  <table className="w-full min-w-[600px] text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Shop Owner', 'Email', 'Orders', 'Total Sales', `Platform Cut (${commissionPercentage}%)`, 'Vendor Payout'].map((h) => (
                          <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4 first:rounded-l-xl last:rounded-r-xl">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shopBreakdown.map((s, i) => {
                        const commRate = commissionPercentage / 100;
                        const dynamicPlatformCut = s.totalSales * commRate;
                        const dynamicVendorPayout = s.totalSales * (1 - commRate);
                        return (
                          <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 font-semibold text-slate-700">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-[#FF9A33] flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                                  {(s.name || 'S')[0].toUpperCase()}
                                </div>
                                <span className="font-bold tracking-tight text-slate-800">{s.name || '—'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-500 font-medium text-xs">{s.email || '—'}</td>
                            <td className="py-4 px-4">
                              <span className="font-extrabold text-slate-800">{fmtNum(s.orderCount)}</span>
                              <span className="text-slate-400 font-medium text-xs ml-1.5">({fmtNum(s.deliveredCount)} delivered)</span>
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800">{fmt(s.totalSales)}</td>
                            <td className="py-4 px-4 font-extrabold text-emerald-600">{fmt(dynamicPlatformCut)}</td>
                            <td className="py-4 px-4 font-extrabold text-blue-600">{fmt(dynamicVendorPayout)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {shopBreakdown.length > 1 && (
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50 font-black">
                          <td colSpan={3} className="py-4 px-4 text-slate-500 text-xs uppercase tracking-wider rounded-l-xl">Totals</td>
                          <td className="py-4 px-4 font-black text-slate-800">{fmt(shopBreakdown.reduce((a, s) => a + s.totalSales, 0))}</td>
                          <td className="py-4 px-4 font-black text-emerald-600">{fmt(shopBreakdown.reduce((a, s) => a + s.totalSales, 0) * (commissionPercentage / 100))}</td>
                          <td className="py-4 px-4 font-black text-blue-600 rounded-r-xl">{fmt(shopBreakdown.reduce((a, s) => a + s.totalSales, 0) * (1 - (commissionPercentage / 100)))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>

              {/* Recent Orders specific to the selected branch */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
                <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <FiPackage className="text-primary" /> Recent Orders (Branch level)
                </h2>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8 font-medium">No orders placed yet in this branch.</p>
                ) : (
                  <table className="w-full min-w-[500px] text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Order ID', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
                          <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4 first:rounded-l-xl last:rounded-r-xl">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-primary text-xs">{o.orderId || '—'}</td>
                          <td className="py-4 px-4 font-bold text-slate-700">{o.customer?.name || '—'}</td>
                          <td className="py-4 px-4 font-black text-slate-800">{fmt(o.totalPrice)}</td>
                          <td className="py-4 px-4"><Badge status={o.status} /></td>
                          <td className="py-4 px-4 text-slate-400 font-medium text-xs">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="w-full text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-500 font-medium">
              ⚠️ Select a branch to view detailed operational statistics.
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default BranchesDetails;
