import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMapPin, FiNavigation, FiAlertTriangle } from 'react-icons/fi';
import { productService } from '../../services/productService';
import { setBranch, setBranches } from '../../store/branchSlice';
import { clearCart, selectCartCount } from '../../store/cartSlice';
import toast from 'react-hot-toast';

const LocationModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { activeBranch, branches: rawBranches } = useSelector((s) => s.branch);
  const branches = rawBranches;
  const cartCount = useSelector(selectCartCount);

  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showConfirmClearCart, setShowConfirmClearCart] = useState(null); // stores the target branch to switch to
  const [autoAttempted, setAutoAttempted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !activeBranch && !autoAttempted && branches.length > 0) {
      setAutoAttempted(true);
      handleAutoDetect();
    }
  }, [isOpen, activeBranch, autoAttempted, branches.length]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const { data } = await productService.getBranches();
      dispatch(setBranches(data));
    } catch (e) {
      console.error('Failed to load branches:', e);
      toast.error('Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let list = branches;
        if (list.length === 0) {
          try {
            const { data } = await productService.getBranches();
            list = data.filter((b) => b.name !== 'SHIFA STORE');
            dispatch(setBranches(data));
          } catch {
            setGeoLoading(false);
            return;
          }
        }

        // Reverse geocode to get human readable address
        let detectedAddressName = '';
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
            detectedAddressName = geoData.address.city || geoData.address.town || geoData.address.suburb || geoData.address.county || geoData.name || '';
          }
        } catch (e) {
          console.error('Reverse geocode error:', e);
        }

        // Find nearest branch
        let nearestBranch = null;
        let minDistance = Infinity;

        list.forEach((b) => {
          if (b.location?.latitude && b.location?.longitude) {
            const dist = calculateDistance(latitude, longitude, b.location.latitude, b.location.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              nearestBranch = b;
            }
          }
        });

        // Fallback to first branch if no coordinates match
        if (!nearestBranch && list.length > 0) {
          nearestBranch = list[0];
        }

        setGeoLoading(false);

        if (nearestBranch) {
          const locText = detectedAddressName ? ` (${detectedAddressName})` : '';
          toast.success(`📍 Location Detected${locText}! Active zone set to ${nearestBranch.name}.`);
          initiateBranchSwitch(nearestBranch);
        } else {
          toast.error('No active delivery zones found.');
        }
      },
      async (error) => {
        setGeoLoading(false);
        console.error('Geo error:', error);
        toast.error('Failed to detect location. Please select your zone manually below.');
        if (branches.length === 0) {
          await loadBranches();
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const initiateBranchSwitch = (targetBranch) => {
    // If target branch is same as active branch, just close modal
    if (activeBranch && activeBranch._id === targetBranch._id) {
      onClose();
      return;
    }

    // If cart has items, ask for confirmation
    if (cartCount > 0) {
      setShowConfirmClearCart(targetBranch);
    } else {
      executeBranchSwitch(targetBranch);
    }
  };

  const executeBranchSwitch = (targetBranch) => {
    dispatch(setBranch(targetBranch));
    setShowConfirmClearCart(null);
    onClose();
    // Reload page to re-fetch products, stores, and update the catalog under the new branch context
    window.location.reload();
  };

  const handleConfirmClearCart = () => {
    dispatch(clearCart());
    executeBranchSwitch(showConfirmClearCart);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FiMapPin className="text-primary w-5 h-5" /> Select Delivery Location
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Choose a branch near you to see available items</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Auto Detect Button */}
              <button
                onClick={handleAutoDetect}
                disabled={geoLoading}
                className="w-full py-3.5 px-4 bg-primary/10 hover:bg-primary/15 text-primary text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all border border-primary/20 active:scale-98 disabled:opacity-60"
              >
                <FiNavigation className={`w-4.5 h-4.5 ${geoLoading ? 'animate-spin' : ''}`} />
                {geoLoading ? 'Detecting location...' : 'Use My Current Location (Auto-Detect)'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white">Or Select Manually</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* Branch List */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">Loading active zones...</div>
                ) : branches.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">No delivery zones currently active.</div>
                ) : (
                  branches.map((b) => {
                    const isSelected = activeBranch?._id === b._id;
                    return (
                      <button
                        key={b._id}
                        onClick={() => initiateBranchSwitch(b)}
                        className={`w-full p-4 rounded-xl border text-left flex items-start justify-between gap-3 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5'
                            : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                            <FiMapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{b.name}</p>
                            {b.address && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{b.address}</p>}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/20 px-2 py-0.5 rounded-md self-center">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Confirmation Dialog overlay */}
            <AnimatePresence>
              {showConfirmClearCart && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col justify-center items-center p-6 text-center"
                >
                  <div className="p-3 bg-error/15 text-error rounded-full mb-3">
                    <FiAlertTriangle size={24} />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">Clear Your Cart?</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                    You have items from another location in your cart. Switching zones will empty your cart.
                  </p>
                  <div className="flex items-center gap-3 mt-6 w-full max-w-[280px]">
                    <button
                      onClick={() => setShowConfirmClearCart(null)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmClearCart}
                      className="flex-1 py-2.5 bg-error hover:bg-error-dark text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-error/20"
                    >
                      Clear & Switch
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LocationModal;
