import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPackage, FiMapPin, FiPhone, FiCheck, FiTruck, FiNavigation, FiDollarSign, FiX, FiList 
} from 'react-icons/fi';
import { deliveryService } from '../../services/deliveryService';
import socketService from '../../services/socketService';
import { useSelector } from 'react-redux';
import { Spinner, EmptyState } from '../../components/ui/Loaders';
import DeliveryMap from '../../components/delivery/DeliveryMap';
import toast from 'react-hot-toast';

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('available'); // Default to Available Offers
  const { user } = useSelector((s) => s.auth);
  const [riderCoords, setRiderCoords] = useState(null);
  const [expandedMaps, setExpandedMaps] = useState({});
  const activeOrderIdRef = useRef(null);

  const activeOrder = orders.find(o => ['acceptedByRider', 'pickedUp', 'outForDelivery'].includes(o.status));
  useEffect(() => {
    activeOrderIdRef.current = activeOrder?._id || null;
  }, [orders]);

  const toggleMap = (orderId) => {
    setExpandedMaps(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  useEffect(() => {
    load();
    // Start sending live location
    if (navigator.geolocation) {
      const watcher = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setRiderCoords({ latitude, longitude });
          
          const orderId = activeOrderIdRef.current;
          deliveryService.updateLocation({ latitude, longitude, orderId }).catch(() => {});
          
          const socketPayload = { latitude, longitude };
          if (orderId) socketPayload.orderId = orderId;
          socketService.sendLocationUpdate(socketPayload);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (tab) params.status = tab;
      const { data } = await deliveryService.getAssignedOrders(params);
      setOrders(data);
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to load orders');
    } finally { 
      setLoading(false); 
    }
  };

  const handleAction = async (orderId, action, data = {}) => {
    try {
      if (action === 'accept') {
        await deliveryService.acceptDelivery(orderId, data);
        toast.success('Delivery accepted! 🚴');
      } else if (action === 'pickup') {
        await deliveryService.pickupOrder(orderId);
        toast.success('Order picked up from shop!');
      } else if (action === 'start') {
        await deliveryService.startDelivery(orderId);
        toast.success('Out for delivery! 🗺️');
      } else if (action === 'complete') {
        const otp = prompt('Enter delivery OTP provided by the customer:');
        if (!otp) return;
        await deliveryService.completeDelivery(orderId, { otp });
        toast.success('Order delivered successfully! 🎉');
      } else if (action === 'cancel') {
        if (!confirm('Are you sure you want to cancel this delivery assignment? The order will be released back to the available queue.')) return;
        await deliveryService.cancelDelivery(orderId);
        toast.success('Delivery assignment cancelled and released');
      }
      load();
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.message;
      if (status === 400 && action === 'complete') {
        toast.error(msg === 'Invalid OTP' ? '❌ Wrong OTP. Please ask the customer for the correct code.' : (msg || 'Cannot complete delivery'));
      } else if (status === 403) {
        toast.error('Session error — please log out and log back in.');
      } else {
        toast.error(msg || 'Action failed. Please try again.');
      }
    }
  };

  const getActionButton = (order) => {
    const s = order.status;
    if (s === 'available') return { label: 'Accept Delivery Offer', action: 'accept', color: 'gradient-primary', icon: FiCheck };
    if (s === 'assigned') return { label: 'Accept', action: 'accept', color: 'bg-blue-500', icon: FiCheck };
    if (s === 'acceptedByRider') return { label: 'Picked Up', action: 'pickup', color: 'bg-cyan-500', icon: FiPackage };
    if (s === 'pickedUp') return { label: 'Start Delivery', action: 'start', color: 'bg-primary', icon: FiTruck };
    if (s === 'outForDelivery') return { label: 'Complete Delivery (OTP)', action: 'complete', color: 'bg-success', icon: FiCheck };
    return null;
  };

  return (
    <div className="p-2 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo.png" alt="" className="w-10 h-10 rounded-xl shadow-sm" />
        <div>
          <h1 className="text-xl font-bold text-text">Delivery Dashboard</h1>
          <p className="text-sm text-text-secondary">Hi, {user?.name || 'Rider'}! 🚴</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { 
            label: 'Active Jobs', 
            value: orders.filter((o) => o.deliveryPartner === user?._id && !['delivered', 'cancelled'].includes(o.status)).length, 
            icon: FiTruck, 
            color: 'text-primary' 
          },
          { 
            label: 'Delivered', 
            value: orders.filter((o) => o.deliveryPartner === user?._id && o.status === 'delivered').length, 
            icon: FiCheck, 
            color: 'text-success' 
          },
          { 
            label: 'Earnings', 
            value: `₹${orders.filter((o) => o.deliveryPartner === user?._id && o.status === 'delivered').reduce((s, o) => s + (o.totalPrice * 0.1), 0).toFixed(0)}`, 
            icon: FiDollarSign, 
            color: 'text-purple-500' 
          },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-border/30 shadow-sm text-center">
            <s.icon className={`w-6 h-6 mx-auto ${s.color}`} />
            <p className="text-lg font-black text-text mt-1">{s.value}</p>
            <p className="text-[10px] font-bold text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide py-1">
        {[
          { key: 'available', label: 'Available Offers 🏷️' },
          { key: '', label: 'My All Jobs' },
          { key: 'acceptedByRider', label: 'Accepted' },
          { key: 'pickedUp', label: 'Picked Up' },
          { key: 'outForDelivery', label: 'Delivering' },
          { key: 'delivered', label: 'Completed' }
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${tab === t.key ? 'gradient-primary text-white shadow-sm' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <Spinner className="py-20" />
      ) : orders.length === 0 ? (
        <EmptyState 
          icon="📦" 
          title={tab === 'available' ? "No Available Offers" : "No orders found"} 
          description={tab === 'available' ? "Orders accepted by stores will show up here for you to claim!" : "You will see your jobs here"} 
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {orders.map((order, i) => {
              const actionBtn = getActionButton(order);
              return (
                <motion.div 
                  key={order._id} 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-border/30 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-border/10 pb-2">
                    <div>
                      <span className="text-sm font-black text-text">{order.orderId}</span>
                      <p className="text-[10px] font-bold text-text-secondary mt-0.5 uppercase tracking-wider bg-bg-secondary px-2 py-0.5 rounded-lg w-fit">
                        Status: <span className="text-primary">{order.status === 'acceptedByRider' ? 'accepted' : order.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-primary">₹{order.totalPrice}</span>
                      <p className="text-[9px] text-text-tertiary font-bold mt-0.5">Est. Earning: ₹{(order.totalPrice * 0.1).toFixed(0)}</p>
                    </div>
                  </div>

                  {/* Pick & Drop Locations */}
                  <div className="space-y-2 mb-3 bg-bg-secondary/40 p-3 rounded-xl border border-border/20">
                    <div className="flex items-start gap-2 text-xs text-text-secondary">
                      <FiMapPin className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-text text-[11px]">PICKUP FROM STORE</p>
                        <p className="line-clamp-2 mt-0.5 font-medium">{order.branch?.name} • {order.branch?.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-text-secondary border-t border-border/10 pt-2">
                      <FiMapPin className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-text text-[11px]">DELIVER TO CUSTOMER</p>
                        <p className="line-clamp-2 mt-0.5 font-medium">{order.deliveryLocation?.address || 'Customer Location'}</p>
                      </div>
                    </div>
                    {order.customer?.phone && order.deliveryPartner === user?._id && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary border-t border-border/10 pt-2">
                        <FiPhone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-bold">{order.customer.name} • {order.customer.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Navigation Map Button & Panel */}
                  {['acceptedByRider', 'pickedUp', 'outForDelivery'].includes(order.status) && order.deliveryPartner === user?._id && (
                    <div className="mb-3 p-3 bg-bg-secondary/40 rounded-xl border border-border/20">
                      <button
                        type="button"
                        onClick={() => toggleMap(order._id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer border-none bg-transparent outline-none"
                      >
                        <FiNavigation className="w-3.5 h-3.5 animate-pulse-soft text-primary" /> {expandedMaps[order._id] ? 'Hide Navigation Map' : 'Show Navigation Map'}
                      </button>
                      
                      {expandedMaps[order._id] && (
                        <div className="mt-3">
                          <DeliveryMap
                            riderLocation={riderCoords}
                            destinationLocation={
                              order.status === 'acceptedByRider'
                                ? order.pickupLocation
                                : order.deliveryLocation
                            }
                            destinationType={order.status === 'acceptedByRider' ? 'shop' : 'customer'}
                            destinationName={
                              order.status === 'acceptedByRider'
                                ? (order.branch?.name || 'Store')
                                : (order.customer?.name || 'Customer')
                            }
                            destinationAddress={
                              order.status === 'acceptedByRider'
                                ? (order.branch?.address || '')
                                : (order.deliveryLocation?.address || '')
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed Items List - AMOUNT, DETAILS, etc. */}
                  <div className="mb-4 pt-3 border-t border-dashed border-border/40">
                    <p className="text-xs font-black text-text flex items-center gap-1 mb-2">
                      <FiList className="w-3.5 h-3.5 text-primary" /> Product Details & Amounts ({order.items?.length || 0})
                    </p>
                    <div className="space-y-1.5">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start bg-bg-secondary/60 px-3 py-2.5 rounded-xl text-xs hover:bg-bg-secondary transition-colors flex-wrap gap-1">
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="font-bold text-text truncate">{item.item?.name || 'Store Item'}</p>
                            <p className="text-[10px] text-text-secondary mt-0.5 font-medium">Quantity: {item.item?.quantity || '1 unit'}</p>
                            {item.item?.shop && (
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="text-[9.5px] text-primary font-black bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/15">
                                  🏪 Shop: {item.item.shop.shopName || 'Main Shop'} ({item.item.shop.shopAddress || 'Address not listed'})
                                </span>
                                {(() => {
                                  const shopId = item.item.shop._id || item.item.shop;
                                  const child = order.childOrders?.find(c => c.shopOwner?.toString() === shopId?.toString());
                                  if (child) {
                                    let statusText = child.status;
                                    let badgeColor = "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
                                    if (child.status === 'pending') {
                                      statusText = 'Pending Store Acceptance ⏳';
                                      badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
                                    } else if (child.status === 'accepted') {
                                      statusText = 'Accepted & Preparing 🍳';
                                      badgeColor = "bg-blue-500/10 text-blue-600 border-blue-500/20";
                                    } else if (child.status === 'acceptedByRider') {
                                      statusText = 'Ready for Pickup 🚴';
                                      badgeColor = "bg-purple-500/10 text-purple-600 border-purple-500/20";
                                    } else if (child.status === 'pickedUp') {
                                      statusText = 'Picked Up 📦';
                                      badgeColor = "bg-teal-500/10 text-teal-600 border-teal-500/20";
                                    } else if (child.status === 'outForDelivery') {
                                      statusText = 'Out for Delivery 🗺️';
                                      badgeColor = "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
                                    } else if (child.status === 'delivered') {
                                      statusText = 'Delivered ✅';
                                      badgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                                    } else if (child.status === 'rejected') {
                                      statusText = 'Rejected by Store ❌';
                                      badgeColor = "bg-rose-500/10 text-rose-600 border-rose-500/20";
                                    }
                                    return (
                                      <span className={`text-[9.5px] font-black px-2.5 py-1 rounded-lg border ${badgeColor}`}>
                                        {statusText}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 mt-0.5">
                            <span className="font-extrabold text-text">₹{item.item?.price || 0}</span>
                            <span className="text-text-secondary font-bold ml-1.5">× {item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex gap-2">
                    {actionBtn && (
                      <motion.button 
                        whileTap={{ scale: 0.95 }} 
                        onClick={() => handleAction(order._id, actionBtn.action)}
                        className={`flex-grow py-2.5 ${actionBtn.color} text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm`}
                      >
                        <actionBtn.icon className="w-4 h-4" /> {actionBtn.label}
                      </motion.button>
                    )}

                    {/* Rider Cancellation Option */}
                    {['assigned', 'acceptedByRider', 'pickedUp', 'outForDelivery'].includes(order.status) && order.deliveryPartner === user?._id && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAction(order._id, 'cancel')}
                        className="px-4 py-2.5 bg-error hover:bg-error-dark text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                        title="Release this delivery assignment"
                      >
                        <FiX className="w-4 h-4" /> Cancel Delivery
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
