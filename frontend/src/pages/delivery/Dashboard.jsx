import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPackage, FiMapPin, FiPhone, FiCheck, FiTruck, FiNavigation, FiDollarSign, FiX, FiList 
} from 'react-icons/fi';
import { deliveryService } from '../../services/deliveryService';
import socketService from '../../services/socketService';
import { useSelector } from 'react-redux';
import { Spinner, EmptyState } from '../../components/ui/Loaders';
import toast from 'react-hot-toast';
import DeliveryMap from '../../components/delivery/DeliveryMap';

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('available'); // Default to Available Offers
  const { user } = useSelector((s) => s.auth);
  const [riderCoords, setRiderCoords] = useState(null);
  const activeOrderIdRef = useRef(null);
  const [processing, setProcessing] = useState({});
  const [modalConfig, setModalConfig] = useState(null);

  const activeOrder = orders.find(o => ['acceptedByRider', 'pickedUp', 'outForDelivery'].includes(o.status));
  
  // Filter active order out of general lists
  const displayedOrders = orders.filter(o => o._id !== activeOrder?._id);

  useEffect(() => {
    activeOrderIdRef.current = activeOrder?._id || null;
  }, [orders]);

  const handleOpenGoogleMaps = (order) => {
    if (!order) return;
    const isPickup = order.status === 'acceptedByRider';

    let destinationParam = '';

    if (isPickup) {
      // Pickup from store/branch
      const pLat = order.pickupLocation?.latitude || order.pickupLocation?.lat || order.branch?.location?.latitude || order.branch?.location?.lat;
      const pLng = order.pickupLocation?.longitude || order.pickupLocation?.lng || order.branch?.location?.longitude || order.branch?.location?.lng;
      const pAddr = order.pickupLocation?.address || order.branch?.address || order.branch?.name;

      if (pLat && pLng) {
        destinationParam = `${pLat},${pLng}`;
      } else if (pAddr) {
        destinationParam = encodeURIComponent(pAddr);
      }
    } else {
      // Deliver to customer
      const dLat = order.deliveryLocation?.latitude || order.deliveryLocation?.lat || order.customer?.liveLocation?.latitude;
      const dLng = order.deliveryLocation?.longitude || order.deliveryLocation?.lng || order.customer?.liveLocation?.longitude;
      const dAddr = order.deliveryLocation?.address || order.customer?.address;

      if (dLat && dLng) {
        destinationParam = `${dLat},${dLng}`;
      } else if (dAddr) {
        destinationParam = encodeURIComponent(dAddr);
      }
    }

    let originParam = '';
    if (riderCoords?.latitude && riderCoords?.longitude) {
      originParam = `&origin=${riderCoords.latitude},${riderCoords.longitude}`;
    }

    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destinationParam}&travelmode=driving`;
    window.open(url, '_blank');
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
      const [ordersRes, historyRes] = await Promise.all([
        deliveryService.getAssignedOrders(params),
        deliveryService.getAssignedOrders({ status: 'delivered' })
      ]);
      setOrders(ordersRes.data);
      setHistoryOrders(historyRes.data);
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to load orders');
    } finally { 
      setLoading(false); 
    }
  };

  const handleAction = async (orderId, action, data = {}) => {
    if (action === 'cancel') {
      setModalConfig({
        type: 'cancel',
        orderId,
        title: 'Cancel Delivery Assignment',
        message: 'Are you sure you want to cancel this delivery assignment? The order will be released back to the available queue.',
        onConfirm: () => executeAction(orderId, action)
      });
      return;
    }

    if (action === 'complete') {
      setModalConfig({
        type: 'otp',
        orderId,
        title: 'Verify Delivery OTP',
        message: 'Please ask the customer for the delivery verification OTP and enter it below to complete this job.',
        placeholder: 'Enter 4-digit OTP',
        onConfirm: (otp) => executeAction(orderId, action, { otp })
      });
      return;
    }

    // Direct actions (accept, pickup, start)
    executeAction(orderId, action, data);
  };

  const executeAction = async (orderId, action, data = {}) => {
    setProcessing(prev => ({ ...prev, [orderId]: true }));
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
        await deliveryService.completeDelivery(orderId, data);
        toast.success('Order delivered successfully! 🎉');
      } else if (action === 'cancel') {
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
    } finally {
      setProcessing(prev => ({ ...prev, [orderId]: false }));
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
            gradient: 'from-blue-500/10 to-indigo-500/5',
            borderColor: 'border-blue-500/20',
            iconColor: 'text-blue-500' 
          },
          { 
            label: 'Delivered', 
            value: orders.filter((o) => o.deliveryPartner === user?._id && o.status === 'delivered').length, 
            icon: FiCheck, 
            gradient: 'from-emerald-500/10 to-teal-500/5',
            borderColor: 'border-emerald-500/20',
            iconColor: 'text-emerald-500' 
          },
          { 
            label: 'Earnings', 
            value: `₹${orders.filter((o) => o.deliveryPartner === user?._id && o.status === 'delivered').reduce((s, o) => s + (o.totalPrice * 0.1), 0).toFixed(0)}`, 
            icon: FiDollarSign, 
            gradient: 'from-purple-500/10 to-pink-500/5',
            borderColor: 'border-purple-500/20',
            iconColor: 'text-purple-500' 
          },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-4 border ${s.borderColor} shadow-sm text-center transition-all hover:scale-[1.02] duration-300`}>
            <s.icon className={`w-6 h-6 mx-auto ${s.iconColor}`} />
            <p className="text-xl font-black text-text mt-1">{s.value}</p>
            <p className="text-[10px] font-bold text-text-secondary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Active Delivery High-Priority Panel ── */}
      {activeOrder && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
        >
          {/* Decorative glowing elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] font-black text-primary tracking-widest uppercase">CURRENT ACTIVE DELIVERY</p>
              <h2 className="text-lg font-bold font-mono text-white mt-1">{activeOrder.orderId}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-bold block">Estimated Earning</span>
              <span className="text-xl font-black text-emerald-400">₹{(activeOrder.totalPrice * 0.1).toFixed(0)}</span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="my-6">
            <div className="flex items-center justify-between relative mb-2">
              {/* Connector line */}
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-700 z-0">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{
                    width: activeOrder.status === 'acceptedByRider' ? '0%' :
                           activeOrder.status === 'pickedUp' ? '50%' :
                           activeOrder.status === 'outForDelivery' ? '100%' : '0%'
                  }}
                />
              </div>

              {[
                { key: 'acceptedByRider', label: 'Claimed', icon: '📝' },
                { key: 'pickedUp', label: 'At Store', icon: '📦' },
                { key: 'outForDelivery', label: 'Delivering', icon: '🚴' }
              ].map((step, idx) => {
                const statuses = ['acceptedByRider', 'pickedUp', 'outForDelivery'];
                const currentIndex = statuses.indexOf(activeOrder.status);
                const stepIndex = statuses.indexOf(step.key);
                const isCompleted = stepIndex < currentIndex;
                const isActive = stepIndex === currentIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center z-10">
                    <div 
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        isCompleted ? 'bg-primary text-white scale-105' :
                        isActive ? 'bg-emerald-500 text-white animate-pulse ring-4 ring-emerald-500/20 scale-110' :
                        'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {isCompleted ? '✓' : step.icon}
                    </div>
                    <span className={`text-[10px] font-extrabold mt-1.5 transition-colors ${
                      isActive ? 'text-emerald-400 font-black' : 
                      isCompleted ? 'text-primary' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper active action & maps direction details */}
          <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5">
            {/* Interactive Leaflet Map Component with Turn-by-Turn GPS Navigation */}
            <div className="mb-3 text-text shadow-md rounded-2xl overflow-hidden">
              <DeliveryMap
                riderLocation={riderCoords}
                destinationLocation={
                  activeOrder.status === 'acceptedByRider'
                    ? (activeOrder.pickupLocation || activeOrder.branch?.location)
                    : (activeOrder.deliveryLocation || activeOrder.customer?.liveLocation)
                }
                destinationType={activeOrder.status === 'acceptedByRider' ? 'shop' : 'customer'}
                destinationName={activeOrder.status === 'acceptedByRider' ? activeOrder.branch?.name : (activeOrder.customer?.name || 'Customer')}
                destinationAddress={activeOrder.status === 'acceptedByRider' ? activeOrder.branch?.address : activeOrder.deliveryLocation?.address}
              />
            </div>

            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <FiMapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">
                  {activeOrder.status === 'acceptedByRider' ? 'PICKUP FROM STORE' : 'DELIVER TO CUSTOMER'}
                </p>
                <p className="text-white font-bold mt-1 text-[13px]">
                  {activeOrder.status === 'acceptedByRider' ? activeOrder.branch?.name : activeOrder.deliveryLocation?.address}
                </p>
                <p className="text-slate-400 mt-0.5 text-[11px]">
                  {activeOrder.status === 'acceptedByRider' ? activeOrder.branch?.address : `Contact: ${activeOrder.customer?.name || 'Customer'}`}
                </p>
              </div>
            </div>

            {activeOrder.customer?.phone && (
              <div className="flex items-center gap-2 text-xs border-t border-white/5 pt-3">
                <FiPhone className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-bold text-slate-300">{activeOrder.customer.name} • <a href={`tel:${activeOrder.customer.phone}`} className="text-primary hover:underline">{activeOrder.customer.phone}</a></span>
              </div>
            )}

            <div className="flex gap-2 pt-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => handleOpenGoogleMaps(activeOrder)}
                className="flex-1 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-light hover:text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <FiNavigation className="w-4 h-4 text-primary animate-pulse" />
                Open Directions Map
              </button>

              {(() => {
                const actionBtn = getActionButton(activeOrder);
                return actionBtn && (
                  <button
                    onClick={() => handleAction(activeOrder._id, actionBtn.action)}
                    disabled={processing[activeOrder._id]}
                    className={`flex-1 py-3 ${actionBtn.color} hover:opacity-95 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 transition-all`}
                  >
                    {processing[activeOrder._id] ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <actionBtn.icon className="w-4.5 h-4.5" /> {actionBtn.label}
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          </div>
        </motion.div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Orders List */}
          {loading ? (
            <Spinner className="py-20" />
          ) : displayedOrders.length === 0 ? (
            <EmptyState 
              icon="📦" 
              title={tab === 'available' ? "No Available Offers" : "No orders found"} 
              description={tab === 'available' ? "Orders accepted by stores will show up here for you to claim!" : "You will see your jobs here"} 
            />
          ) : (
            <div className="space-y-4">
          <AnimatePresence>
            {displayedOrders.map((order, i) => {
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

                  {/* Google Maps Direct Navigation Button */}
                  {['acceptedByRider', 'pickedUp', 'outForDelivery'].includes(order.status) && order.deliveryPartner === user?._id && (
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() => handleOpenGoogleMaps(order)}
                        className="w-full py-3 bg-primary/10 border border-primary/20 hover:bg-primary/25 text-primary hover:text-primary-dark text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                      >
                        <FiNavigation className="w-4 h-4 animate-pulse text-primary" />
                        {order.status === 'acceptedByRider' 
                          ? 'Navigate to Store (Google Maps) 🏪' 
                          : 'Navigate to Customer (Google Maps) 🏠'}
                      </button>
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
                        disabled={processing[order._id]}
                        className={`flex-grow py-2.5 ${actionBtn.color} text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 transition-all`}
                      >
                        {processing[order._id] && !modalConfig ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <actionBtn.icon className="w-4 h-4" /> {actionBtn.label}
                          </>
                        )}
                      </motion.button>
                    )}

                    {/* Rider Cancellation Option */}
                    {['assigned', 'acceptedByRider', 'pickedUp', 'outForDelivery'].includes(order.status) && order.deliveryPartner === user?._id && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAction(order._id, 'cancel')}
                        disabled={processing[order._id]}
                        className="px-4 py-2.5 bg-error hover:bg-error-dark text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors disabled:opacity-60"
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

        {/* Right Sidebar: Completed Deals History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-border/30 p-5 shadow-sm sticky top-20">
            <h3 className="text-sm font-bold text-text mb-4 uppercase tracking-wider flex items-center gap-2">
              📜 Completed Deals History ({historyOrders.length})
            </h3>
            {historyOrders.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-8">No completed deals in history yet.</p>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                {historyOrders.map((deal) => (
                  <div key={deal._id} className="p-3 bg-bg-secondary/40 rounded-xl border border-border/20 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono font-bold text-primary">{deal.orderId}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Delivered
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary">
                      Date: {new Date(deal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex justify-between mt-2 pt-1.5 border-t border-border/10">
                      <span className="text-text-secondary">Total price:</span>
                      <span className="font-bold text-text">₹{deal.totalPrice}</span>
                    </div>
                    {deal.distance && (
                      <div className="flex justify-between mt-0.5">
                        <span className="text-text-secondary">Distance:</span>
                        <span className="font-semibold text-text">{deal.distance} km</span>
                      </div>
                    )}
                    {deal.deliveryPartnerPayout && (
                      <div className="flex justify-between mt-0.5">
                        <span className="text-text-secondary">Rider Payout:</span>
                        <span className="font-bold text-success">₹{deal.deliveryPartnerPayout}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GORGEOUS GLASSMORPHISM MODAL DIALOG */}
      <AnimatePresence>
        {modalConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-border/30 p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <h3 className="text-base font-black text-text mb-2 flex items-center gap-2">
                {modalConfig.type === 'otp' ? '🔑' : '⚠️'} {modalConfig.title}
              </h3>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed font-semibold">
                {modalConfig.message}
              </p>
              
              {modalConfig.type === 'otp' && (
                <input
                  type="text"
                  placeholder={modalConfig.placeholder || "Enter 4-digit OTP"}
                  autoFocus
                  id="custom-otp-input"
                  className="w-full px-4 py-3 bg-bg-secondary rounded-xl text-center text-lg font-black tracking-widest border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none mb-4 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.target.value;
                      if (val.trim()) {
                        modalConfig.onConfirm(val.trim());
                        setModalConfig(null);
                      }
                    }
                  }}
                />
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalConfig(null)}
                  className="px-4 py-2.5 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-xs font-bold rounded-xl transition-all cursor-pointer border-none outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (modalConfig.type === 'otp') {
                      const input = document.getElementById('custom-otp-input');
                      if (input && input.value.trim()) {
                        modalConfig.onConfirm(input.value.trim());
                        setModalConfig(null);
                      }
                    } else {
                      modalConfig.onConfirm();
                      setModalConfig(null);
                    }
                  }}
                  className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-none outline-none shadow-sm ${
                    modalConfig.type === 'otp' ? 'bg-success hover:bg-success-dark' : 'bg-error hover:bg-error-dark'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryDashboard;
