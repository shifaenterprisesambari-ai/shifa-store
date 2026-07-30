import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiShoppingBag, FiPackage, FiTruck,
  FiTrendingUp, FiDollarSign, FiRefreshCw,
  FiAlertCircle, FiCheckCircle, FiClock, FiXCircle,
  FiCheck, FiTrash2,
} from 'react-icons/fi';
import { MdStorefront, MdOutlineReceiptLong } from 'react-icons/md';
import { getAdminStats, getConfig, updateConfig, updateBranchCommission, getPendingRequests, approveRequest, rejectRequest, calculateProfit, calculateRiderPayout } from '../../services/adminService';
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

/* ── Sparkline Bar Chart (pure SVG, no lib) ── */
const BarChart = ({ data }) => {
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="flex items-end gap-1.5 h-28 w-full mt-4">
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-md">
              {fmt(d.revenue)}<br />{d.orders} orders
            </div>
            <div className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary-light/80 hover:brightness-95 transition-all duration-500"
              style={{ height: `${Math.max(pct, 5)}%` }} />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center leading-tight">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ── KPI Card ── */
const KpiCard = ({ label, value, icon: Icon, colorTheme, sub, delay = 0 }) => {
  const themeMap = {
    indigo: { bg: 'bg-indigo-50 text-indigo-600', border: 'border-t-indigo-500' },
    emerald: { bg: 'bg-emerald-50 text-emerald-600', border: 'border-t-emerald-500' },
    cyan: { bg: 'bg-cyan-50 text-cyan-600', border: 'border-t-cyan-500' },
    violet: { bg: 'bg-violet-50 text-violet-600', border: 'border-t-violet-500' },
    red: { bg: 'bg-red-50 text-red-600', border: 'border-t-red-500' },
    amber: { bg: 'bg-amber-50 text-amber-600', border: 'border-t-amber-500' },
    sky: { bg: 'bg-sky-50 text-sky-600', border: 'border-t-sky-500' },
    teal: { bg: 'bg-teal-50 text-teal-600', border: 'border-t-teal-500' },
  };

  const theme = themeMap[colorTheme] || themeMap.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden bg-white border border-slate-200 border-t-4 ${theme.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between h-32`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors duration-300">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${theme.bg} transition-transform duration-300 group-hover:scale-110 shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
      {sub && <p className="text-[10px] text-slate-500 font-semibold mt-2 truncate bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 w-fit">{sub}</p>}
    </motion.div>
  );
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

/* ══════════════════════════════════════════════════════════════
   Main Dashboard
// ══════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { user } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState({ rider_pay_per_km: 3.5, shop_commission_percentage: 10 });
  const [payRateInput, setPayRateInput] = useState('3.5');
  const [commissionInput, setCommissionInput] = useState('10');
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingReqs, setPendingReqs] = useState({ shopOwners: [], deliveryPartners: [] });
  const [calcDaysInput, setCalcDaysInput] = useState('10');
  const [calcShopInput, setCalcShopInput] = useState('all');
  const [calcResults, setCalcResults] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcRiderDaysInput, setCalcRiderDaysInput] = useState('10');
  const [calcRiderSelectInput, setCalcRiderSelectInput] = useState('all');
  const [calcRiderResults, setCalcRiderResults] = useState(null);
  const [calculatingRider, setCalculatingRider] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [statsRes, configRes, reqsRes] = await Promise.all([
        getAdminStats(),
        getConfig(),
        getPendingRequests(),
      ]);
      setStats(statsRes.data);
      setConfig(configRes.data);
      setPayRateInput(configRes.data.rider_pay_per_km?.toString() || '3.5');
      setCommissionInput(configRes.data.shop_commission_percentage?.toString() || '10');
      setPendingReqs(reqsRes.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (userId, role) => {
    try {
      const res = await approveRequest(userId, role);
      toast.success(res.data?.message || 'Request approved successfully!');
      load(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (userId, role) => {
    if (!window.confirm('Are you sure you want to reject and delete this registration request?')) return;
    try {
      const res = await rejectRequest(userId, role);
      toast.success(res.data?.message || 'Request rejected successfully!');
      load(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const val = parseFloat(payRateInput);
      if (isNaN(val) || val <= 0) return toast.error('Please enter a valid rate');
      await updateConfig({ rider_pay_per_km: val });
      toast.success('Rider payout rate updated successfully!');
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rates');
    }
  };

  const handleSaveCommission = async (e) => {
    e.preventDefault();
    try {
      const val = parseFloat(commissionInput);
      if (isNaN(val) || val < 0 || val > 100) return toast.error('Commission percentage must be between 0 and 100');
      await updateConfig({ shop_commission_percentage: val });
      toast.success('Shop commission rate updated successfully!');
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update commission');
    }
  };

  const handleCalculateProfit = async (e) => {
    e.preventDefault();
    setCalculating(true);
    setCalcResults(null);
    try {
      const { data } = await calculateProfit(calcDaysInput, calcShopInput);
      setCalcResults(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to calculate profit');
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculateRiderPayout = async (e) => {
    e.preventDefault();
    setCalculatingRider(true);
    setCalcRiderResults(null);
    try {
      const { data } = await calculateRiderPayout(calcRiderDaysInput, calcRiderSelectInput);
      setCalcRiderResults(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to calculate rider payout');
    } finally {
      setCalculatingRider(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <div className="w-9 h-9 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Console...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-center">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-3 border border-red-100">
          <FiAlertCircle size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Operational Blocked</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{error}</p>
        <button onClick={() => load()} className="mt-4 px-5 py-2.5 gradient-primary text-white text-xs font-semibold rounded-xl hover:shadow-lg transition cursor-pointer">
          Try Reloading
        </button>
      </div>
    );
  }

  const dailyChart = stats.dailyChart || [];
  const shopBreakdown = stats.shopBreakdown || [];
  const deliveryBreakdown = stats.deliveryBreakdown || [];
  const recentOrders = stats.recentOrders || [];
  const shopOwnerHistory = stats.shopOwnerHistory || [];
  const deliveryHistory = stats.deliveryHistory || [];

  const orders = stats.orders || { total: 0, byStatus: {} };

  const kpis = [
    { label: 'Total Revenue',      value: fmt(stats.revenue?.total), icon: FiDollarSign, colorTheme: 'indigo', sub: `${stats.orders?.delivered || 0} delivered orders` },
    { label: 'Platform Commission', value: fmt(stats.revenue?.platformEarnings), icon: FiTrendingUp, colorTheme: 'emerald', sub: `${config.shop_commission_percentage || 10}% platform cuts` },
    { label: 'Total Stores',       value: fmtNum(stats.users?.shopOwners), icon: MdStorefront, colorTheme: 'violet', sub: `${shopBreakdown.length} active stores` },
    { label: 'Active Riders',      value: fmtNum(stats.users?.deliveryPartners), icon: FiTruck, colorTheme: 'cyan', sub: 'Available for dispatch' },
  ];

  const isSubBranch = !!user?.branch;
  const bgClass = isSubBranch ? "bg-[#F3F4F6]" : "bg-[#FFFFFF]";

  return (
    <div className={`w-full min-h-screen ${bgClass} px-4 sm:px-8 pt-20 sm:pt-24 pb-20 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8 flex-wrap">
          <img src="/logo.png" alt="" className="w-12 h-12 rounded-2xl shadow-sm border border-slate-200 shrink-0" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={`text-2xl font-black bg-gradient-to-r ${isSubBranch ? 'from-blue-600 to-indigo-600' : 'from-[#FF7A00] to-[#FFC400]'} bg-clip-text text-transparent tracking-tight`}>
                {isSubBranch ? 'Sub-Branch Admin Panel' : 'Master Admin Panel'}
              </h1>
              {isSubBranch ? (
                <>
                  <span className="px-2.5 py-0.5 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                    📍 {user?.branch?.name?.toUpperCase() || 'SUB-BRANCH'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1 shadow-xs">
                    ⚡ Platform Cut: <strong>{stats?.branchInfo?.commissionPercentage ?? config.shop_commission_percentage ?? 10}%</strong>
                  </span>
                </>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-200 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm animate-pulse-soft">
                  👑 SYSTEM OWNER
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold tracking-wide">
              {isSubBranch
                ? `Real-time management panel for ${user?.branch?.name || 'Sub-Branch'} (Site Owner Charge: ${stats?.branchInfo?.commissionPercentage ?? config.shop_commission_percentage ?? 10}%)`
                : 'Real-time enterprise intelligence & operations — Shifa Store'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {!isSubBranch && (
              <Link to="/admin/branches-details"
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary hover:bg-slate-50 transition shadow-sm cursor-pointer">
                📍 Sub-Branches Details
              </Link>
            )}
            <button onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer">
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k, i) => <KpiCard key={i} {...k} delay={i * 0.06} />)}
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mb-8 overflow-x-auto scrollbar-hide border border-slate-200/80 shadow-sm max-w-fit">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'shopHistory', label: '🏪 Shop Deals' },
            { key: 'deliveryHistory', label: '🚴 Delivery Deals' },
            { key: 'shopRequests', label: `🏪 Shop Requests (${pendingReqs.shopOwners?.length || 0})` },
            { key: 'deliveryRequests', label: `🚴 Rider Requests (${pendingReqs.deliveryPartners?.length || 0})` },
          ].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${activeTab === t.key ? 'bg-white text-primary shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* ── Revenue Chart + Status Breakdown ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg">Revenue — Last 7 Days</h2>
                    <p className="text-xs text-slate-500 font-semibold">Delivered orders only</p>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full shadow-sm">
                    {fmt(dailyChart.reduce((a, d) => a + d.revenue, 0))} this week
                  </span>
                </div>
                <BarChart data={dailyChart} />
              </motion.div>

              {/* Status Breakdown */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <MdOutlineReceiptLong className="text-primary" /> Order Status
                </h2>
                <div className="space-y-3">
                  {Object.entries(orders?.byStatus || {}).map(([status, count]) => {
                    const m = STATUS_META[status];
                    if (!m) return null;
                    const pct = orders.total > 0 ? Math.round((count / orders.total) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-slate-500">{m.label}</span>
                          <span className="text-xs font-bold text-slate-700">{fmtNum(count)} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.7, duration: 0.6 }}
                             className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light" />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(orders?.byStatus || {}).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No orders yet</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* ── Shop Owner Breakdown Table ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <FiShoppingBag className="text-primary" /> Shop Owners & Merchant Breakdown
                </h2>
                <p className="text-xs text-slate-500 font-medium">Default Platform Cut: <strong>{commissionInput || 10}%</strong></p>
              </div>
              {!shopBreakdown || shopBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No shop data yet. Orders will appear here once placed.</p>
              ) : (
                <table className="w-full min-w-[650px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Shop Owner', 'Email', 'Orders', 'Total Sales', `Platform Cut (${commissionInput || 10}%)`, 'Vendor Payout', 'Action'].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4 first:rounded-l-xl last:rounded-r-xl">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shopBreakdown.map((s, i) => {
                      const commRate = (Number(commissionInput) || 0) / 100;
                      const dynamicPlatformCut = s.totalSales * commRate;
                      const dynamicVendorPayout = s.totalSales * (1 - commRate);
                      return (
                        <motion.tr key={i}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.05 }}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all duration-200">
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
                          <td className="py-4 px-4">
                            {!isSubBranch && (
                              <button
                                onClick={async () => {
                                  const valStr = window.prompt(`Set custom Commission Cut (%) for ${s.name}:`, commissionInput || '10');
                                  if (valStr === null) return;
                                  const val = parseFloat(valStr);
                                  if (isNaN(val) || val < 0 || val > 100) return toast.error('Commission percentage must be between 0 and 100');
                                  try {
                                    await updateBranchCommission({ shopOwnerId: s._id, commissionPercentage: val });
                                    toast.success(`Commission rate for ${s.name} updated to ${val}%! 🎉`);
                                    load(true);
                                  } catch (err) {
                                    toast.error('Failed to update shop commission');
                                  }
                                }}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-all border border-indigo-200 cursor-pointer shadow-xs"
                              >
                                ⚙️ Set % Cut
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  {shopBreakdown.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-black">
                        <td colSpan={3} className="py-4 px-4 text-slate-500 text-xs uppercase tracking-wider rounded-l-xl">Totals</td>
                        <td className="py-4 px-4 font-black text-slate-800">{fmt(shopBreakdown.reduce((a, s) => a + s.totalSales, 0))}</td>
                        <td className="py-4 px-4 font-black text-emerald-600">{fmt(shopBreakdown.reduce((a, s) => a + s.totalSales, 0) * ((Number(commissionInput) || 0) / 100))}</td>
                        <td colSpan={2} className="py-4 px-4 font-black text-blue-600 rounded-r-xl">{fmt(shopBreakdown.reduce((a, s) => a + s.totalSales, 0) * (1 - (Number(commissionInput) || 0) / 100))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </motion.div>

            {/* ── Profit, Payout & Settings Panels ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Column 1: Shop Owner Panels */}
              <div className="flex flex-col gap-6">
                {/* Shop Owner Profit Calculator */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}
                  className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-600 opacity-90" />
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg mb-3">⚙️ Shop Owner Profit Calculator</h2>
                    <form onSubmit={handleCalculateProfit} className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 font-bold block mb-1">Number of Days</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={calcDaysInput}
                            onChange={(e) => setCalcDaysInput(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none"
                            placeholder="e.g. 10"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 font-bold block mb-1">Select Shop</label>
                          <select
                            value={calcShopInput}
                            onChange={(e) => setCalcShopInput(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none font-semibold"
                          >
                            <option value="all">All Shops</option>
                            {shopBreakdown.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={calculating}
                        className="w-full py-2 gradient-primary text-white font-bold rounded-xl text-xs hover:shadow-lg transition-all cursor-pointer flex items-center justify-center min-h-[36px] disabled:opacity-50"
                      >
                        {calculating ? 'Calculating...' : 'Calculate Profit'}
                      </button>
                    </form>
                  </div>

                  {calcResults && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                    >
                      <p className="font-bold text-slate-800 mb-1">📊 Profit Summary (Last {calcResults.days} Days)</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delivered Orders:</span>
                        <span className="font-bold text-slate-700">{calcResults.deliveredCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Sales:</span>
                        <span className="font-bold text-slate-800">{fmt(calcResults.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Platform Cut ({commissionInput || 0}%):</span>
                        <span className="font-bold text-emerald-600">{fmt(calcResults.totalSales * ((Number(commissionInput) || 0) / 100))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vendor Payout:</span>
                        <span className="font-bold text-blue-600">{fmt(calcResults.totalSales * (1 - (Number(commissionInput) || 0) / 100))}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Shop Commission Settings */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.60 }}
                  className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-500 opacity-90" />
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg mb-3">⚙️ Shop Owner Commission Settings</h2>
                    <form onSubmit={handleSaveCommission} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 font-bold block mb-1">Platform Commission (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          required
                          value={commissionInput}
                          onChange={(e) => setCommissionInput(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <button type="submit" className="px-5 py-2.5 gradient-primary text-white font-bold rounded-xl text-xs hover:shadow-lg transition-all cursor-pointer h-10 flex items-center justify-center min-w-[120px]">
                        Save Commission
                      </button>
                    </form>
                  </div>
                </motion.div>
              </div>

              {/* Column 2: Rider Panels */}
              <div className="flex flex-col gap-6">
                {/* Rider Payout Calculator */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
                  className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-indigo-600 opacity-90" />
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg mb-3">⚙️ Rider Payout Calculator</h2>
                    <form onSubmit={handleCalculateRiderPayout} className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 font-bold block mb-1">Number of Days</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={calcRiderDaysInput}
                            onChange={(e) => setCalcRiderDaysInput(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none"
                            placeholder="e.g. 10"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-slate-500 font-bold block mb-1">Select Rider</label>
                          <select
                            value={calcRiderSelectInput}
                            onChange={(e) => setCalcRiderSelectInput(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none font-semibold"
                          >
                            <option value="all">All Riders</option>
                            {deliveryBreakdown.map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={calculatingRider}
                        className="w-full py-2 gradient-primary text-white font-bold rounded-xl text-xs hover:shadow-lg transition-all cursor-pointer flex items-center justify-center min-h-[36px] disabled:opacity-50"
                      >
                        {calculatingRider ? 'Calculating...' : 'Calculate Payout'}
                      </button>
                    </form>
                  </div>

                  {calcRiderResults && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                    >
                      <p className="font-bold text-slate-800 mb-1">📊 Payout Summary (Last {calcRiderResults.days} Days)</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delivered Orders:</span>
                        <span className="font-bold text-slate-700">{calcRiderResults.deliveredCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Distance:</span>
                        <span className="font-bold text-slate-800">{(calcRiderResults.totalDistance || 0).toFixed(2)} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rider Payout (₹{payRateInput || 0}/km):</span>
                        <span className="font-bold text-blue-600">{fmt((calcRiderResults.totalDistance || 0) * (Number(payRateInput) || 0), 2)}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Rider Payout Settings */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.64 }}
                  className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-amber-500 opacity-90" />
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg mb-3">⚙️ Rider Payout Rates Settings</h2>
                    <form onSubmit={handleSaveConfig} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 font-bold block mb-1">Rider Payout (₹ per km)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={payRateInput}
                          onChange={(e) => setPayRateInput(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <button type="submit" className="px-5 py-2.5 gradient-primary text-white font-bold rounded-xl text-xs hover:shadow-lg transition-all cursor-pointer h-10 flex items-center justify-center min-w-[100px]">
                        Save Rate
                      </button>
                    </form>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ── Delivery Partner Breakdown Table ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 overflow-x-auto">
              <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <FiTruck className="text-primary" /> Delivery Partners Earnings & Distances
              </h2>
              {!deliveryBreakdown || deliveryBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No delivery partner data yet. Orders will appear here once delivered.</p>
              ) : (
                <table className="w-full min-w-[600px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Rider Name', 'Phone', 'Deliveries', 'Total Distance (km)', `Earnings Payout (₹${payRateInput}/km)`].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider p-4 first:rounded-l-xl last:rounded-r-xl">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryBreakdown.map((d, i) => (
                      <motion.tr key={i}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.67 + i * 0.05 }}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all duration-200">
                        <td className="py-4 px-4 font-semibold text-slate-700">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                              {(d.name || 'R')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold tracking-tight text-slate-800">{d.name || '—'}</p>
                                {d.idNumber && (
                                  <span className="px-1.5 py-0.5 bg-sky-100 border border-sky-200 text-sky-700 text-[9px] font-black rounded-md">
                                    {d.idNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">{d.email || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-medium text-xs">{d.phone || '—'}</td>
                        <td className="py-4 px-4 font-extrabold text-slate-800">{fmtNum(d.completedDeliveries)}</td>
                        <td className="py-4 px-4 font-bold text-slate-800">{(d.totalDistance || 0).toFixed(2)} km</td>
                        <td className="py-4 px-4 font-extrabold text-blue-600">{fmt((d.totalDistance || 0) * (Number(payRateInput) || 0), 2)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                  {deliveryBreakdown.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-black">
                        <td colSpan={2} className="py-4 px-4 text-slate-500 text-xs uppercase tracking-wider rounded-l-xl">Totals</td>
                        <td className="py-4 px-4 font-black text-slate-800">{fmtNum(deliveryBreakdown.reduce((a, d) => a + d.completedDeliveries, 0))}</td>
                        <td className="py-4 px-4 font-black text-slate-800">{deliveryBreakdown.reduce((a, d) => a + (d.totalDistance || 0), 0).toFixed(2)} km</td>
                        <td className="py-4 px-4 font-black text-blue-600 rounded-r-xl">{fmt(deliveryBreakdown.reduce((a, d) => a + (d.totalDistance || 0), 0) * (Number(payRateInput) || 0), 2)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </motion.div>

            {/* ── Recent Orders Table ── */}
            {isSubBranch && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
              <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <FiPackage className="text-primary" /> Recent Orders
              </h2>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No orders placed yet.</p>
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
                    {recentOrders.map((o, i) => (
                      <motion.tr key={o._id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.75 + i * 0.04 }}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all duration-200">
                        <td className="py-4 px-4 font-mono font-bold text-primary text-xs">{o.orderId || '—'}</td>
                        <td className="py-4 px-4 font-bold text-slate-700">{o.customer?.name || '—'}</td>
                        <td className="py-4 px-4 font-black text-slate-800">{fmt(o.totalPrice)}</td>
                        <td className="py-4 px-4"><Badge status={o.status} /></td>
                        <td className="py-4 px-4 text-slate-400 font-medium text-xs">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
            )}
          </>
        )}

        {activeTab === 'shopHistory' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
            <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <FiShoppingBag className="text-primary" /> Shop Owner Deals History Log
            </h2>
            {shopOwnerHistory.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No completed merchant deals in database yet.</p>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Order ID', 'Merchant Store', 'Customer', 'Items Ordered', 'Order Amount', `Commission (${config.shop_commission_percentage || 10}%)`, 'Merchant Payout', 'Date'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shopOwnerHistory.map((h, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 font-mono font-bold text-primary text-xs">{h.orderId}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">
                        <div>
                          <p>{h.shopOwner?.shopName || h.shopOwner?.name || '—'}</p>
                          {h.shopOwner?.idNumber && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-black rounded-md">
                              {h.shopOwner.idNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{h.customer?.name || '—'}</td>
                      <td className="py-3 pr-4 max-w-[200px] truncate text-slate-500 font-medium" title={h.items?.map(it => `${it.item?.name} x${it.count}`).join(', ')}>
                        {h.items?.map(it => `${it.item?.name} x${it.count}`).join(', ') || '—'}
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-800">₹{h.totalPrice}</td>
                      <td className="py-3 pr-4 font-semibold text-emerald-600">₹{h.platformEarnings || 0}</td>
                      <td className="py-3 pr-4 font-bold text-blue-600">₹{h.vendorPayout || 0}</td>
                      <td className="py-3 text-slate-400 text-xs">
                        {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        )}

        {activeTab === 'deliveryHistory' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
            <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <FiTruck className="text-primary" /> Delivery Partner Deals History Log
            </h2>
            {deliveryHistory.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No completed delivery partner deals in database yet.</p>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Order ID', 'Rider Partner', 'Customer', 'Distance', 'Customer Paid Fee', 'Rider Payout Earned', 'Date'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deliveryHistory.map((h, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 font-mono font-bold text-primary text-xs">{h.orderId}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-slate-700">{h.deliveryPartner?.name || '—'}</p>
                            {h.deliveryPartner?.idNumber && (
                              <span className="px-1.5 py-0.5 bg-sky-100 border border-sky-200 text-sky-700 text-[9px] font-black rounded-md">
                                {h.deliveryPartner.idNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">{h.deliveryPartner?.phone || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{h.customer?.name || '—'}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700">{h.distance || 0} km</td>
                      <td className="py-3 pr-4 font-semibold text-emerald-600">₹{h.deliveryFee || 0}</td>
                      <td className="py-3 pr-4 font-bold text-blue-600">₹{h.deliveryPartnerPayout || 0}</td>
                      <td className="py-3 text-slate-400 text-xs">
                        {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        )}

        {activeTab === 'shopRequests' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
            <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <FiShoppingBag className="text-primary" /> Shop Owner Registration Requests
            </h2>
            {!pendingReqs.shopOwners || pendingReqs.shopOwners.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No pending shop owner registration requests.</p>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Name', 'Email', 'Phone', 'Shop Name', 'Shop Address', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingReqs.shopOwners.map((req, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{req.name}</span>
                          {req.idNumber && (
                            <span className="px-1.5 py-0.5 bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-black rounded-md">
                              {req.idNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{req.email || '—'}</td>
                      <td className="py-3 pr-4 font-mono text-slate-700">{req.phone}</td>
                      <td className="py-3 pr-4 font-bold text-primary">{req.shopName}</td>
                      <td className="py-3 pr-4 text-slate-500 font-medium">{req.shopAddress || '—'}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req._id, 'ShopOwner')}
                            className="p-2 rounded-xl bg-success/15 hover:bg-success/25 text-success transition-colors cursor-pointer flex items-center justify-center inline-flex border border-success/10"
                            title="Approve Shop Owner Request"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(req._id, 'ShopOwner')}
                            className="p-2 rounded-xl bg-error/15 hover:bg-error/25 text-error transition-colors cursor-pointer flex items-center justify-center inline-flex border border-error/10"
                            title="Reject Shop Owner Request"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        )}

        {activeTab === 'deliveryRequests' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
            <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <FiTruck className="text-primary" /> Delivery Partner Registration Requests
            </h2>
            {!pendingReqs.deliveryPartners || pendingReqs.deliveryPartners.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No pending delivery partner registration requests.</p>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Name', 'Email', 'Phone', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingReqs.deliveryPartners.map((req, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{req.name}</span>
                          {req.idNumber && (
                            <span className="px-1.5 py-0.5 bg-sky-100 border border-sky-200 text-sky-700 text-[9px] font-black rounded-md">
                              {req.idNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{req.email || '—'}</td>
                      <td className="py-3 pr-4 font-mono text-slate-700">{req.phone}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req._id, 'DeliveryPartner')}
                            className="p-2 rounded-xl bg-success/15 hover:bg-success/25 text-success transition-colors cursor-pointer flex items-center justify-center inline-flex border border-success/10"
                            title="Approve Delivery Partner"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(req._id, 'DeliveryPartner')}
                            className="p-2 rounded-xl bg-error/15 hover:bg-error/25 text-error transition-colors cursor-pointer flex items-center justify-center inline-flex border border-error/10"
                            title="Reject Delivery Partner"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
