import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit2, FiSave } from 'react-icons/fi';
import { authService } from '../../services/authService';
import { updateProfile } from '../../store/authSlice';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: user?.name || '', phone: user?.phone || '', address: user?.address || '' } });

  // Auto-populate form once user profile data is successfully loaded
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values };
      if (!payload.phone) {
        delete payload.phone; // Prevent empty strings from triggering Mongoose duplicate key or cast errors
      }
      const { data } = await authService.updateUser(payload);
      dispatch(updateProfile(data.user));
      setEditing(false);
      toast.success('Profile updated!');
    } catch (e) {
      console.error("Profile update error:", e);
      toast.error(e.response?.data?.message || e.message || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-6">
      <h1 className="text-xl font-bold text-text mb-6">My Profile</h1>

      <div className="bg-white rounded-2xl border border-border/30 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-text">{user?.name || 'User'}</h2>
            <p className="text-sm text-text-secondary">{user?.email || user?.phone}</p>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1 inline-block">{user?.role}</span>
          </div>
          <button onClick={() => { setEditing(!editing); if (editing) reset(); }} className="p-2 rounded-xl hover:bg-bg-secondary transition-colors">
            <FiEdit2 className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { icon: FiUser, label: 'Name', field: 'name', type: 'text' },
            { icon: FiPhone, label: 'Phone', field: 'phone', type: 'tel' },
            { icon: FiMapPin, label: 'Address', field: 'address', type: 'text' },
          ].map(({ icon: Icon, label, field, type }) => (
            <div key={field}>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input {...register(field)} type={type} disabled={!editing}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all ${editing ? 'bg-bg-secondary border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none' : 'bg-bg-tertiary text-text-secondary border border-transparent cursor-not-allowed'}`} />
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
              <input value={user?.email || ''} disabled className="w-full pl-10 pr-4 py-3 bg-bg-tertiary rounded-xl text-sm text-text-secondary border border-transparent cursor-not-allowed" />
            </div>
          </div>

          {editing && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
              className="w-full py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiSave className="w-4 h-4" /> Save Changes</>}
            </motion.button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;
