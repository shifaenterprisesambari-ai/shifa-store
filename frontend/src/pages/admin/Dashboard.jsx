import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiShoppingBag, FiPackage, FiTruck,
  FiTrendingUp, FiDollarSign, FiRefreshCw,
  FiAlertCircle, FiCheckCircle, FiClock, FiXCircle,
} from 'react-icons/fi';
import { MdStorefront, MdOutlineReceiptLong } from 'react-icons/md';
import { getAdminStats } from '../../services/adminService';

/* ── helpers ── */
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtNum = (n) =>
  new Intl.NumberFormat('en-IN').format(n ?? 0);

const STATUS_META = {
  pending:        { label: 'Pending',         color: 'bg-amber-100  text-amber-700',  icon: FiClock },
  accepted:       { label: 'Accepted',        color: 'bg-blue-100   text-blue-700',   icon: FiCheckCircle },
  outForDelivery: { label: 'Out for Delivery',color: 'bg-purple-100 text-purple-700', icon: FiTruck },
  delivered:      { label: 'Delivered',       color: 'bg-emerald-100 text-emerald-700',icon: FiCheckCircle },
  cancelled:      { label: 'Cancelled',       color: 'bg-red-100    text-red-700',    icon: FiXCircle },
};

/* ── Sparkline Bar Chart (pure SVG, no lib) ── */
const BarChart = ({ data }) => {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const W = 100 / data.length;

  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {fmt(d.revenue)}<br />{d.orders} orders
            </div>
            <div className="w-full rounded-t-md bg-gradient-to-t from-[#5b6af0] to-[#8b97ff] transition-all duration-500"
              style={{ height: `${Math.max(pct, 3)}%` }} />
            <span className="text-[9px] text-gray-400 text-center leading-tight">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ── KPI Card ── */
const KpiCard = ({ label, value, icon: Icon, gradient, sub, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    className="relative overflow-hidden rounded-2xl p-5 shadow-sm border border-white/10 hover:shadow-lg transition-shadow"
    style={{ background: gradient }}
  >
    <div className="absolute right-4 top-4 opacity-20">
      <Icon size={42} className="text-white" />
    </div>
    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-2xl font-extrabold text-white leading-tight">{value}</p>
    {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
  </motion.div>
);

/* ── Status Badge ── */
const Badge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: FiPackage };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.color}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════
   Main Dashboard
══════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const { data } = await getAdminStats();
      setStats(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-gray-100 animate-pulse mb-6" />
      <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
    </div>
  );

  /* ── Error state ── */
  if (error) return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center gap-4 min-h-[50vh]">
      <FiAlertCircle size={40} className="text-red-400" />
      <p className="text-red-500 font-semibold">{error}</p>
      <button onClick={() => load()}
        className="px-5 py-2 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition">
        Retry
      </button>
    </div>
  );

  const { revenue, orders, users, shopBreakdown = [], recentOrders = [], dailyChart = [] } = stats;

  const kpis = [
    { label: 'Total Revenue',      value: fmt(revenue.total),            icon: FiDollarSign, gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', sub: `${fmtNum(orders.delivered)} delivered orders` },
    { label: 'Platform Earnings',  value: fmt(revenue.platformEarnings), icon: FiTrendingUp,  gradient: 'linear-gradient(135deg,#059669,#10b981)', sub: '10% commission on deliveries' },
    { label: 'Vendor Payouts',     value: fmt(revenue.vendorPayout),     icon: MdStorefront,  gradient: 'linear-gradient(135deg,#0891b2,#06b6d4)', sub: 'Net paid to shop owners' },
    { label: 'Total Orders',       value: fmtNum(orders.total),          icon: FiPackage,     gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', sub: `${orders.pending} pending` },
    { label: 'Customers',          value: fmtNum(users.customers),       icon: FiUsers,       gradient: 'linear-gradient(135deg,#dc2626,#f87171)', sub: 'Registered customers' },
    { label: 'Shop Owners',        value: fmtNum(users.shopOwners),      icon: FiShoppingBag, gradient: 'linear-gradient(135deg,#d97706,#fbbf24)', sub: 'Active merchants' },
    { label: 'Delivery Partners',  value: fmtNum(users.deliveryPartners),icon: FiTruck,       gradient: 'linear-gradient(135deg,#0369a1,#38bdf8)', sub: 'Active riders' },
    { label: 'Delivered Today',    value: fmtNum(dailyChart[dailyChart.length-1]?.orders ?? 0), icon: FiCheckCircle, gradient: 'linear-gradient(135deg,#065f46,#34d399)', sub: fmt(dailyChart[dailyChart.length-1]?.revenue ?? 0) },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-20">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8 flex-wrap">
        <img src="/logo.png" alt="" className="w-11 h-11 rounded-xl shadow" />
        <div>
          <h1 className="text-2xl font-extrabold text-text">Site Owner Dashboard</h1>
          <p className="text-sm text-text-secondary">Real-time business analytics — Shifa Store</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-semibold text-text-secondary hover:bg-gray-50 transition shadow-sm">
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => <KpiCard key={i} {...k} delay={i * 0.06} />)}
      </div>

      {/* ── Revenue Chart + Status Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-border/30 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-text text-lg">Revenue — Last 7 Days</h2>
              <p className="text-xs text-text-secondary">Delivered orders only</p>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {fmt(dailyChart.reduce((a, d) => a + d.revenue, 0))} this week
            </span>
          </div>
          <BarChart data={dailyChart} />
        </motion.div>

        {/* Status Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-white rounded-2xl border border-border/30 shadow-sm p-6">
          <h2 className="font-bold text-text text-lg mb-4 flex items-center gap-2">
            <MdOutlineReceiptLong className="text-primary" /> Order Status
          </h2>
          <div className="space-y-3">
            {Object.entries(orders.byStatus).map(([status, count]) => {
              const m = STATUS_META[status];
              if (!m) return null;
              const pct = orders.total > 0 ? Math.round((count / orders.total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-text-secondary">{m.label}</span>
                    <span className="text-xs font-bold text-text">{fmtNum(count)} <span className="text-text-tertiary font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.7, duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-purple-400" />
                  </div>
                </div>
              );
            })}
            {Object.keys(orders.byStatus).length === 0 && (
              <p className="text-sm text-text-tertiary text-center py-4">No orders yet</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Shop Owner Breakdown Table ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="bg-white rounded-2xl border border-border/30 shadow-sm p-6 mb-6 overflow-x-auto">
        <h2 className="font-bold text-text text-lg mb-4 flex items-center gap-2">
          <FiShoppingBag className="text-primary" /> Shop Owner Earnings Breakdown
        </h2>
        {shopBreakdown.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-6">No shop data yet. Orders will appear here once placed.</p>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Shop Owner', 'Email', 'Orders', 'Total Sales', 'Platform Cut (10%)', 'Vendor Payout'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shopBreakdown.map((s, i) => (
                <motion.tr key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.05 }}
                  className="border-b border-border/20 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-text">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(s.name || 'S')[0].toUpperCase()}
                      </div>
                      {s.name || '—'}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-text-secondary text-xs">{s.email || '—'}</td>
                  <td className="py-3 pr-4">
                    <span className="font-bold text-text">{fmtNum(s.orderCount)}</span>
                    <span className="text-text-tertiary text-xs ml-1">({fmtNum(s.deliveredCount)} delivered)</span>
                  </td>
                  <td className="py-3 pr-4 font-bold text-text">{fmt(s.totalSales)}</td>
                  <td className="py-3 pr-4 font-semibold text-emerald-600">{fmt(s.platformCut)}</td>
                  <td className="py-3 font-bold text-blue-600">{fmt(s.vendorPayout)}</td>
                </motion.tr>
              ))}
            </tbody>
            {shopBreakdown.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-border/40 bg-gray-50/60">
                  <td colSpan={3} className="py-3 pr-4 font-bold text-text-secondary text-xs uppercase">Totals</td>
                  <td className="py-3 pr-4 font-extrabold text-text">{fmt(shopBreakdown.reduce((a, s) => a + s.totalSales, 0))}</td>
                  <td className="py-3 pr-4 font-extrabold text-emerald-600">{fmt(shopBreakdown.reduce((a, s) => a + s.platformCut, 0))}</td>
                  <td className="py-3 font-extrabold text-blue-600">{fmt(shopBreakdown.reduce((a, s) => a + s.vendorPayout, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </motion.div>

      {/* ── Recent Orders Table ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl border border-border/30 shadow-sm p-6 overflow-x-auto">
        <h2 className="font-bold text-text text-lg mb-4 flex items-center gap-2">
          <FiPackage className="text-primary" /> Recent Orders
        </h2>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-6">No orders placed yet.</p>
        ) : (
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Order ID', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o, i) => (
                <motion.tr key={o._id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.75 + i * 0.04 }}
                  className="border-b border-border/20 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 pr-4 font-mono font-bold text-primary text-xs">{o.orderId || '—'}</td>
                  <td className="py-3 pr-4 font-medium text-text">{o.customer?.name || '—'}</td>
                  <td className="py-3 pr-4 font-bold text-text">{fmt(o.totalPrice)}</td>
                  <td className="py-3 pr-4"><Badge status={o.status} /></td>
                  <td className="py-3 text-text-secondary text-xs">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
