import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiMapPin, FiClock, FiCreditCard, FiDollarSign } from 'react-icons/fi';
import { selectCartItems, selectCartTotal, clearCart } from '../../store/cartSlice';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { authService } from '../../services/authService';
import { updateProfile } from '../../store/authSlice';
import MapLocationPicker from '../../components/ui/MapLocationPicker';
import toast from 'react-hot-toast';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Checkout = () => {
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (user && !selectedLocation) {
      setSelectedLocation({
        address: user.address || user.addresses?.[0]?.address || '',
        latitude: user.liveLocation?.latitude || user.addresses?.[0]?.latitude || null,
        longitude: user.liveLocation?.longitude || user.addresses?.[0]?.longitude || null
      });
    }
  }, [user]);

  const handleLocationSelect = async (loc) => {
    setSelectedLocation(loc);
    dispatch(updateProfile({
      address: loc.address,
      liveLocation: {
        latitude: loc.latitude,
        longitude: loc.longitude
      }
    }));
    try {
      await authService.updateUser({
        address: loc.address,
        liveLocation: {
          latitude: loc.latitude,
          longitude: loc.longitude
        }
      });
      toast.success('Location updated & saved to your profile! 📍');
    } catch (err) {
      console.error('Failed to update profile location:', err);
    }
  };
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
      
      const payload = {
        items: orderItems,
        branch: branchId,
        totalPrice: grandTotal,
        paymentMethod: paymentMethod,
      };

      if (selectedLocation) {
        payload.deliveryLocation = {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: selectedLocation.address
        };
      }

      const { data } = await orderService.createOrder(payload);

      if (paymentMethod === 'Online') {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error('Failed to load payment gateway script. Please check your connection.');
          setLoading(false);
          return;
        }

        const options = {
          key: data.razorpayOrder.key,
          amount: data.razorpayOrder.amount,
          currency: data.razorpayOrder.currency,
          name: 'Shifa Store',
          description: 'Payment for your order',
          order_id: data.razorpayOrder.id,
          handler: async (response) => {
            setLoading(true);
            try {
              const verifyRes = await orderService.verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              dispatch(clearCart());
              toast.success('Payment successful & Order placed! 🎉');
              navigate(`/order-tracking/${verifyRes.data.order._id}`);
            } catch (err) {
              console.error('Payment verification failed:', err);
              toast.error(err.response?.data?.message || 'Payment verification failed');
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: {
            color: '#10B981',
          },
          modal: {
            ondismiss: () => {
              toast.error('Payment cancelled');
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        dispatch(clearCart());
        toast.success('Order placed successfully! 🎉');
        navigate(`/order-tracking/${data._id}`);
      }
    } catch (e) {
      console.error("Order creation failed error:", e);
      toast.error(e.response?.data?.message || e.message || 'Failed to place order');
    } finally {
      if (paymentMethod !== 'Online') {
        setLoading(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cart" className="p-2 rounded-xl hover:bg-bg-secondary transition-colors"><FiArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold text-text">Checkout</h1>
      </div>

      {/* Delivery Address */}
      <div className="bg-white rounded-2xl border border-border/30 p-5 mb-4 shadow-sm animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1"><FiMapPin className="w-5 h-5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-text">Delivery Address</h3>
            <textarea
              rows={2}
              value={selectedLocation?.address || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLocation(prev => ({ ...prev, address: val }));
                dispatch(updateProfile({ address: val }));
                authService.updateUser({ address: val }).catch(console.error);
              }}
              placeholder="Type or edit your delivery address manually here..."
              className="w-full text-xs text-text font-bold mt-1 bg-bg-secondary p-2.5 rounded-xl border border-border/30 focus:outline-none focus:border-primary/45 focus:bg-white transition-all resize-none h-16 leading-relaxed"
            />
            {selectedLocation?.latitude && selectedLocation?.longitude && (
              <p className="text-[10px] text-text-tertiary font-semibold mt-1.5 flex items-center gap-1">
                📍 Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </p>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setShowMap(true)}
            className="text-xs text-primary font-bold cursor-pointer hover:underline border-none bg-transparent outline-none py-1.5 px-3 rounded-lg hover:bg-primary/5 transition-all shrink-0 mt-1"
          >
            Pin on Map
          </button>
        </div>
      </div>

      {showMap && (
        <MapLocationPicker
          title="Pin Delivery Location"
          initialCoords={{
            latitude: selectedLocation?.latitude,
            longitude: selectedLocation?.longitude
          }}
          initialAddress={selectedLocation?.address || ''}
          onClose={() => setShowMap(false)}
          onSelect={handleLocationSelect}
        />
      )}

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

      {/* Payment Method */}
      <div className="bg-white rounded-2xl border border-border/30 p-5 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-text mb-3">Payment Method</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('COD')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center cursor-pointer transition-all ${
              paymentMethod === 'COD'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold'
                : 'border-border/60 hover:bg-bg-secondary text-text-secondary'
            }`}
          >
            <FiDollarSign className="w-5 h-5" />
            <span className="text-xs">Cash on Delivery</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('Online')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center cursor-pointer transition-all ${
              paymentMethod === 'Online'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-semibold'
                : 'border-border/60 hover:bg-bg-secondary text-text-secondary'
            }`}
          >
            <FiCreditCard className="w-5 h-5" />
            <span className="text-xs">Pay Online (Razorpay)</span>
          </button>
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
