import { motion } from 'framer-motion';
import { FiUsers, FiShoppingBag, FiPackage, FiTruck, FiDollarSign, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';

/* [MOCK] — Admin dashboard uses static demo data. No admin API endpoints exist in the backend. */
const AdminDashboard = () => {
  const stats = [
    { label: 'Total Users', value: '1,254', icon: FiUsers, color: 'bg-blue-500', change: '+12%' },
    { label: 'Total Shops', value: '5', icon: FiShoppingBag, color: 'bg-primary', change: '+2' },
    { label: 'Total Orders', value: '3,847', icon: FiPackage, color: 'bg-purple-500', change: '+8%' },
    { label: 'Delivery Partners', value: '18', icon: FiTruck, color: 'bg-cyan-500', change: '+3' },
    { label: 'Revenue', value: '₹2,84,500', icon: FiDollarSign, color: 'bg-success', change: '+15%' },
    { label: 'Growth', value: '24%', icon: FiTrendingUp, color: 'bg-yellow-500', change: '+5%' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="" className="w-10 h-10 rounded-xl" />
        <div>
          <h1 className="text-2xl font-bold text-text">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary">Overview of Shifa Store</p>
        </div>
        <span className="ml-auto px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">[MOCK] Demo Data</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl font-bold text-text">{s.value}</p>
            <p className="text-xs text-text-secondary">{s.label}</p>
            <span className="text-[10px] text-success font-medium mt-1 inline-block">{s.change}</span>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-border/30 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2"><FiBarChart2 className="w-5 h-5 text-primary" /> Recent Activity</h2>
        <div className="space-y-3">
          {[
            { time: '2 min ago', text: 'New order #ORDR00247 placed by Rahul Kumar', type: 'order' },
            { time: '15 min ago', text: 'Delivery completed for order #ORDR00246', type: 'delivery' },
            { time: '1 hour ago', text: 'New shop "Fresh Mart" onboarded', type: 'shop' },
            { time: '3 hours ago', text: 'Low stock alert: Amul Milk at Shifa Store', type: 'alert' },
            { time: '5 hours ago', text: 'New delivery partner Suresh registered', type: 'partner' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
              <div className={`w-2 h-2 rounded-full ${item.type === 'alert' ? 'bg-error' : item.type === 'delivery' ? 'bg-success' : 'bg-primary'}`} />
              <div className="flex-1">
                <p className="text-sm text-text">{item.text}</p>
                <p className="text-[10px] text-text-tertiary">{item.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
