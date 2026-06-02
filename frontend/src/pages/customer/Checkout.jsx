import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiMapPin, FiClock } from 'react-icons/fi';
import { selectCartItems, selectCartTotal, clearCart } from '../../store/cartSlice';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import toast from 'react-hot-toast';

const Checkout = () => {
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const deliveryFee = total > 199 ? 0 : 25;
  const grandTotal = total + deliveryFee;

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    if (items.length === 0) navigate('/cart');
  }, [isAuthenticated, items]);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setLoading(true);
    try {
      const orderItems = items.map((item) => ({ id: item._id, item: item._id, count: item.count }));
      // Use first available branch or item shop
      const branchId = items[0]?.shop || items[0]?.branch;
      const { data } = await orderService.createOrder({
        items: orderItems,
        branch: branchId,
        totalPrice: grandTotal,
      });
      dispatch(clearCart());
      toast.success('Order placed successfully! 🎉');
      navigate(`/order-tracking/${data._id}`);
    } catch (e) {
      console.error("Order creation failed error:", e);
      toast.error(e.response?.data?.message || e.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cart" className="p-2 rounded-xl hover:bg-bg-secondary transition-colors"><FiArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold text-text">Checkout</h1>
      </div>

      {/* Delivery Address */}
      <div className="bg-white rounded-2xl border border-border/30 p-5 mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FiMapPin className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-text">Delivery Address</h3>
            <p className="text-xs text-text-secondary mt-0.5">{user?.address || user?.addresses?.[0]?.address || 'Set your delivery address'}</p>
          </div>
          <Link to="/profile" className="text-xs text-primary font-semibold">Change</Link>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-border/30 p-5 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-text mb-3">Order Summary ({items.length} items)</h3>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item._id} className="flex items-center gap-3">
              <img src={item.image} alt={item.name} className="w-12 h-12 object-contain rounded-lg bg-bg-secondary p-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text line-clamp-1">{item.name}</p>
                <p className="text-xs text-text-tertiary">{item.quantity} × {item.count}</p>
              </div>
              <span className="text-sm font-bold">₹{item.price * item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bill */}
      <div className="bg-white rounded-2xl border border-border/30 p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-bold text-text mb-3">Bill Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-text-secondary">Item total</span><span>₹{total}</span></div>
          <div className="flex justify-between"><span className="text-text-secondary">Delivery fee</span><span className={deliveryFee === 0 ? 'text-success font-medium' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
          <hr className="border-border/50" />
          <div className="flex justify-between text-base font-bold"><span>To Pay</span><span>₹{grandTotal}</span></div>
        </div>
      </div>

      {/* ETA */}
      <div className="flex items-center gap-3 bg-success/10 rounded-2xl p-4 mb-6">
        <FiClock className="w-5 h-5 text-success" />
        <div>
          <p className="text-sm font-semibold text-text">Estimated Delivery</p>
          <p className="text-xs text-text-secondary">15 - 25 minutes</p>
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={handlePlaceOrder} disabled={loading}
        className="w-full py-3.5 gradient-primary text-white font-bold text-base rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : `Place Order • ₹${grandTotal}`}
      </motion.button>
    </div>
  );
};

export default Checkout;
