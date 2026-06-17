import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiMinus, FiTrash2, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import { selectCartItems, selectCartTotal, selectCartSavings, incrementQty, decrementQty, removeFromCart, clearCart } from '../../store/cartSlice';
import { EmptyState } from '../../components/ui/Loaders';

const Cart = () => {
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const savings = useSelector(selectCartSavings);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const deliveryFee = total > 499 ? 0 : 25;
  const grandTotal = total + deliveryFee;

  if (items.length === 0) {
    return (
      <EmptyState icon="🛒" title="Your cart is empty" description="Add items from the store to get started"
        action={<Link to="/" className="px-6 py-2.5 gradient-primary text-white rounded-xl font-medium hover:shadow-lg transition-all">Browse Products</Link>} />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Your Cart ({items.length})</h1>
        <button onClick={() => dispatch(clearCart())} className="text-sm text-error font-medium hover:underline">Clear All</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div key={item._id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }}
                className="bg-white rounded-2xl p-4 border border-border/30 shadow-sm flex gap-4 items-center">
                <img src={item.image} alt={item.name} className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-bg-secondary p-2" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-text-tertiary">{item.quantity}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-text">₹{item.price * item.count}</span>
                    {item.discountPrice > item.price && <span className="text-xs text-text-tertiary line-through">₹{item.discountPrice * item.count}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => dispatch(decrementQty(item._id))} className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <FiMinus className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.span key={item.count} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-8 text-center text-sm font-bold">{item.count}</motion.span>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => dispatch(incrementQty(item._id))} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <FiPlus className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
                <button onClick={() => dispatch(removeFromCart(item._id))} className="p-2 text-text-tertiary hover:text-error transition-colors">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bill Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-border/30 p-5 shadow-sm sticky top-20">
            <h3 className="text-base font-bold text-text mb-4">Bill Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-text-secondary">Item total</span><span className="font-medium">₹{total}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">Delivery fee</span><span className={`font-medium ${deliveryFee === 0 ? 'text-success' : ''}`}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
              {savings > 0 && <div className="flex justify-between text-success"><span>You save</span><span className="font-medium">₹{savings}</span></div>}
              <hr className="border-border/50" />
              <div className="flex justify-between text-base font-bold"><span>Grand Total</span><span>₹{grandTotal}</span></div>
            </div>
            {deliveryFee > 0 && <p className="text-xs text-text-tertiary mt-3">Add ₹{499 - total} more for free delivery</p>}
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/checkout')}
              className="w-full mt-5 py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2">
              Proceed to Checkout <FiArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
