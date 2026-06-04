import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiPhone, FiMapPin } from 'react-icons/fi';
import { orderService } from '../../services/orderService';
import socketService from '../../services/socketService';
import { ORDER_TRACKING_STEPS } from '../../constants';
import { Spinner } from '../../components/ui/Loaders';

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await orderService.getOrderById(orderId);
        setOrder(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();

    // Join socket room for real-time updates
    socketService.connect();
    socketService.joinRoom(orderId);

    const events = ['order-accepted', 'rider-assigned', 'order-accepted-by-rider', 'picked-up', 'out-for-delivery', 'delivered', 'liveTrackingUpdates', 'location-updated'];
    events.forEach((ev) => {
      socketService.onOrderUpdate(ev, (data) => {
        if (data.orderId === orderId || data._id === orderId) {
          setOrder((prev) => ({ ...prev, ...data, status: data.status || prev?.status }));
        }
      });
    });

    return () => {
      events.forEach((ev) => socketService.offEvent(ev));
    };
  }, [orderId]);

  if (loading) return <Spinner className="py-20" />;
  if (!order) return <div className="text-center py-20 text-text-secondary">Order not found</div>;

  const currentStepIndex = ORDER_TRACKING_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/orders" className="p-2 rounded-xl hover:bg-bg-secondary transition-colors"><FiArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-lg font-bold text-text">Order {order.orderId}</h1>
          <p className="text-xs text-text-secondary">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl border border-border/30 p-6 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-text mb-5">Order Status</h3>
        {isCancelled ? (
          <div className="text-center py-6">
            <span className="text-4xl">❌</span>
            <p className="text-error font-bold mt-3">Order {order.status === 'rejected' ? 'Rejected' : 'Cancelled'}</p>
            {order.rejectionReason && <p className="text-sm text-text-secondary mt-1">{order.rejectionReason}</p>}
          </div>
        ) : (
          <div className="space-y-0">
            {ORDER_TRACKING_STEPS.map((step, i) => {
              const isDone = i <= currentStepIndex;
              const isActive = i === currentStepIndex;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <motion.div initial={false} animate={{ scale: isActive ? 1.2 : 1 }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 transition-colors ${isDone ? 'gradient-primary text-white shadow-md shadow-primary/30' : 'bg-bg-secondary text-text-tertiary'}`}>
                      {step.icon}
                    </motion.div>
                    {i < ORDER_TRACKING_STEPS.length - 1 && (
                      <div className={`w-0.5 h-10 transition-colors ${isDone ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className={`text-sm font-semibold ${isDone ? 'text-text' : 'text-text-tertiary'}`}>{step.label}</p>
                    {isActive && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-primary mt-0.5">In progress...</motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivery Verification OTP */}
      {order.deliveryOtp && !['delivered', 'cancelled', 'rejected'].includes(order.status) && (
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 mb-4 shadow-sm text-center">
          <p className="text-xs text-primary font-bold uppercase tracking-wider">Delivery Verification OTP</p>
          <p className="text-3xl font-black text-primary mt-2 tracking-widest">{order.deliveryOtp}</p>
          <p className="text-[10px] text-text-secondary mt-2">Provide this 4-digit OTP to the delivery partner when they arrive.</p>
        </div>
      )}

      {/* Delivery Partner Info */}
      {order.deliveryPartner && (
        <div className="bg-white rounded-2xl border border-border/30 p-5 mb-4 shadow-sm">
          <h3 className="text-sm font-bold text-text mb-3">Delivery Partner</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white text-lg font-bold">
              {order.deliveryPartner.name?.[0]?.toUpperCase() || '🚴'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{order.deliveryPartner.name || 'Rider'}</p>
              {order.deliveryPartner.phone && <p className="text-xs text-text-secondary">{order.deliveryPartner.phone}</p>}
            </div>
            {order.deliveryPartner.phone && (
              <a href={`tel:${order.deliveryPartner.phone}`} className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors">
                <FiPhone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-border/30 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-text mb-3">Items ({order.items?.length})</h3>
        <div className="space-y-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <img src={item.item?.image} alt={item.item?.name} className="w-12 h-12 rounded-lg bg-bg-secondary object-contain p-1" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">{item.item?.name}</p>
                <p className="text-xs text-text-tertiary">Qty: {item.count}</p>
              </div>
              <span className="text-sm font-bold">₹{(item.item?.price || 0) * item.count}</span>
            </div>
          ))}
          <hr className="border-border/50" />
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>₹{order.totalPrice}</span></div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
