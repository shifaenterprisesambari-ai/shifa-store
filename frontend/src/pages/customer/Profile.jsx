import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave, FiNavigation, FiAlertCircle } from 'react-icons/fi';
import { authService } from '../../services/authService';
import { updateProfile } from '../../store/authSlice';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(true); // Default to editing mode so fields are editable
  const [loading, setLoading] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone ? String(user.phone) : '',
      address: user?.address || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        phone: user.phone ? String(user.phone) : '',
        address: user.address || '',
      });
    }
  }, [user, reset]);

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      return toast.error('Geolocation is not supported by your browser');
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocode using OpenStreetMap Nominatim API
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setValue('address', data.display_name);
            toast.success('Current location detected and set!');
          } else {
            setValue('address', `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`);
            toast.success('GPS coordinates set!');
          }
        } catch {
          setValue('address', `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`);
          toast.success('GPS coordinates set!');
        } finally {
          setDetectingLoc(false);
        }
      },
      (err) => {
        setDetectingLoc(false);
        console.error('Location detection failed:', err);
        toast.error('Location permission denied or timeout');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };
      if (payload.phone) {
        payload.phone = Number(String(payload.phone).replace(/\D/g, ''));
      } else {
        delete payload.phone;
      }

      const { data } = await authService.updateUser(payload);
      dispatch(updateProfile(data.user));
      toast.success('Profile updated successfully! 🎉');
    } catch (e) {
      console.error('Profile update error:', e);
      toast.error(e.response?.data?.message || e.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const isMissingPhone = !user?.phone;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">My Profile</h1>

      {/* Warning banner if mobile number is missing (e.g. after Google Login) */}
      {isMissingPhone && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-sm shadow-xs"
        >
          <FiAlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Mobile Number Needed</strong>
            <span>Please enter your mobile phone number and delivery address below so riders and shops can contact you for orders.</span>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="w-16 h-16 rounded-2xl object-cover shadow-md shrink-0 border border-slate-100" />
          ) : (
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20 shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-800 truncate">{user?.name || 'User'}</h2>
            <p className="text-sm text-slate-500 truncate">{user?.email || (user?.phone ? `+91 ${user.phone}` : 'No phone set')}</p>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mt-1 inline-block uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name Field */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                {...register('name')}
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center justify-between">
              <span>Mobile Phone Number</span>
              {isMissingPhone && <span className="text-[10px] text-amber-600 font-bold uppercase">Required for delivery</span>}
            </label>
            <div className="relative">
              <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                {...register('phone')}
                type="tel"
                placeholder="Enter 10-digit mobile number"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Address Field with Auto-Detect Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Delivery Address</label>
              <button
                type="button"
                onClick={handleAutoDetectLocation}
                disabled={detectingLoc}
                className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FiNavigation className={`w-3.5 h-3.5 ${detectingLoc ? 'animate-spin' : ''}`} />
                {detectingLoc ? 'Detecting...' : 'Use My Current Location'}
              </button>
            </div>
            <div className="relative">
              <FiMapPin className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
              <textarea
                {...register('address')}
                rows={3}
                placeholder="Enter your street, house number, area address"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Email Field (Read Only) */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                value={user?.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-3 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-sm font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          {/* Save Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 gradient-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiSave className="w-4 h-4" /> Save Profile Changes
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
