import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FiPackage, FiChevronRight } from 'react-icons/fi';
import { orderService } from '../../services/orderService';
import { ORDER_STATUS_LABELS } from '../../constants';
import { Spinner, EmptyState } from '../../components/ui/Loaders';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  acceptedByRider: 'bg-purple-100 text-purple-700',
  pickedUp: 'bg-cyan-100 text-cyan-700',
  outForDelivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    const load = async () => {
      try {
        const params = { customerId: user?._id };
        if (filter) params.status = filter;
        const { data } = await orderService.getOrders(params);
        setOrders(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [filter, user]);

  const filters = ['', 'pending', 'accepted', 'outForDelivery', 'delivered', 'cancelled'];

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">
      <h1 className="text-xl font-bold text-text mb-4">My Orders</h1>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${filter === f ? 'gradient-primary text-white' : 'bg-bg-secondary text-text-secondary hover:bg-gray-200'}`}>
            {f === '' ? 'All' : ORDER_STATUS_LABELS[f] || f}
          </button>
        ))}
      </div>

      {loading ? <Spinner className="py-20" /> : orders.length === 0 ? (
        <EmptyState icon="📦" title="No orders yet" description="Start shopping and your orders will appear here"
          action={<Link to="/" className="px-6 py-2.5 gradient-primary text-white rounded-xl font-medium">Start Shopping</Link>} />
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => (
            <motion.div key={order._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/order-tracking/${order._id}`} className="block bg-white rounded-2xl border border-border/30 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiPackage className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-text">{order.orderId}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {order.items?.slice(0, 3).map((item, j) => (
                      <img key={j} src={item.item?.image || ''} alt="" className="w-10 h-10 rounded-lg border-2 border-white bg-bg-secondary object-contain p-0.5" />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary">{order.items?.length} items</p>
                    <p className="text-sm font-bold text-text">₹{order.totalPrice}</p>
                  </div>
                  <FiChevronRight className="w-5 h-5 text-text-tertiary" />
                </div>
                <p className="text-[10px] text-text-tertiary mt-2">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
