import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiShoppingBag, FiMapPin, FiLayers, FiKey } from 'react-icons/fi';
import { authService } from '../../services/authService';
import api from '../../services/api';
import { loginSuccess } from '../../store/authSlice';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

const Signup = () => {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'customer';
  const [role, setRole] = useState(initialRole);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const phoneValue = watch('phone');

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        setBranches(res.data || []);
      } catch (e) {
        console.error('Failed to load branches', e);
      }
    };
    fetchBranches();
  }, []);

  const handleSendOtp = async () => {
    if (!phoneValue) {
      toast.error('Please enter your mobile number first');
      return;
    }
    setOtpLoading(true);
    try {
      const emailValue = watch('email');
      const res = await authService.sendSignupOtp({ phone: phoneValue, email: emailValue, role });
      toast.success(res.data?.message || 'Verification OTP sent!');
      setOtpSent(true);
      setResendTimer(30);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send OTP code');
    } finally {
      setOtpLoading(false);
    }
  };

  const onSubmit = async (values) => {
    if (!otpSent && !values.otp) {
      toast.error('Please click "Send OTP" and enter the verification code sent to your phone');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (role === 'customer') {
        res = await authService.signup(values);
        dispatch(loginSuccess({ user: res.data.customer, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
        toast.success('Account created successfully!');
        navigate('/');
      } else if (role === 'shopowner') {
        res = await authService.signupShopOwner(values);
        toast.success(res.data?.message || 'Registration request submitted to branch owner for approval!');
        navigate('/login?role=shopowner');
      } else if (role === 'delivery') {
        res = await authService.signupDeliveryPartner(values);
        toast.success(res.data?.message || 'Registration request submitted to branch owner for approval!');
        navigate('/login?role=delivery');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="relative text-center text-white z-10">
          <motion.img src="/logo.png" alt="Shifa Store" className="w-24 h-24 rounded-3xl mx-auto shadow-2xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} />
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-4xl font-extrabold mt-6">Join Shifa Store</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-white/80 mt-3 text-lg">Get groceries delivered fast</motion.p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="Shifa Store" className="w-16 h-16 rounded-2xl mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-text">Create Account 🎉</h2>
          <p className="text-text-secondary text-sm mt-1 mb-6">
            {role === 'customer'
              ? 'Sign up to start ordering'
              : role === 'shopowner'
              ? 'Register your shop on Shifa Store'
              : 'Register as a delivery partner'}
          </p>

          {/* Registration Type Tabs */}
          <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 mb-6">
            {[{ key: 'customer', label: 'Customer' }, { key: 'shopowner', label: 'Shop Owner' }, { key: 'delivery', label: 'Delivery' }].map((t) => (
              <button key={t.key} type="button" onClick={() => setRole(t.key)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${role === t.key ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input {...register('name', { required: 'Name is required' })} type="text" placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
              </div>
              {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Mobile Number</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                  <input {...register('phone', { required: 'Mobile number is required', pattern: { value: /^\+?\d{10,15}$/, message: 'Invalid mobile number' } })} type="tel" placeholder="Enter 10-digit mobile number"
                    className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
                </div>
                <button
                  type="button"
                  disabled={otpLoading || resendTimer > 0}
                  onClick={handleSendOtp}
                  className="px-4 py-3 gradient-primary text-white text-xs font-semibold rounded-xl hover:shadow-md transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {otpLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : resendTimer > 0 ? (
                    `Resend (${resendTimer}s)`
                  ) : otpSent ? (
                    'Resend OTP'
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </div>
              {errors.phone && <p className="text-error text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Verification OTP Code</label>
              <div className="relative">
                <FiKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input
                  {...register('otp', { required: 'Verification OTP code is required' })}
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit SMS OTP"
                  className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all font-semibold tracking-widest text-center text-base"
                />
              </div>
              {errors.otp && <p className="text-error text-xs mt-1">{errors.otp.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Email (Optional)</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input {...register('email', { required: false, pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} type="email" placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
              </div>
              {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
            </div>

            {(role === 'shopowner' || role === 'delivery') && (
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Select Operating Branch</label>
                <div className="relative">
                  <FiLayers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4 pointer-events-none" />
                  <select
                    {...register('branchId', { required: 'Please select a branch' })}
                    className="w-full pl-10 pr-8 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all cursor-pointer text-text font-medium"
                  >
                    <option value="">-- Choose your Branch --</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        📍 {b.name} {b.address ? `(${b.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.branchId && <p className="text-error text-xs mt-1">{errors.branchId.message}</p>}
              </div>
            )}

            {role === 'shopowner' && (
              <>
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">Shop Name</label>
                  <div className="relative">
                    <FiShoppingBag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                    <input {...register('shopName', { required: 'Shop name is required' })} type="text" placeholder="Enter your shop name"
                      className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
                  </div>
                  {errors.shopName && <p className="text-error text-xs mt-1">{errors.shopName.message}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">Shop Address</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                    <input {...register('shopAddress', { required: 'Shop address is required' })} type="text" placeholder="Enter shop address"
                      className="w-full pl-10 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
                  </div>
                  {errors.shopAddress && <p className="text-error text-xs mt-1">{errors.shopAddress.message}</p>}
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })} type={showPwd ? 'text' : 'password'} placeholder="Create a password"
                  className="w-full pl-10 pr-10 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
                  {showPwd ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-error text-xs mt-1">{errors.password.message}</p>}
            </div>

            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
              className="w-full py-3 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
            </motion.button>
          </form>

          {role === 'customer' && (
            <>
              <div className="relative my-5 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <span className="relative px-3 bg-white text-xs font-semibold text-text-tertiary uppercase tracking-wider">Or sign up with</span>
              </div>

              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    if (credentialResponse.credential) {
                      try {
                        setLoading(true);
                        const res = await authService.loginGoogle({ idToken: credentialResponse.credential });
                        const loggedUser = res.data.user;
                        dispatch(loginSuccess({ user: loggedUser, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
                        toast.success(`Welcome to Shifa Store, ${loggedUser.name || 'Customer'}! 🎉`);
                        navigate('/');
                      } catch (err) {
                        toast.error(err.response?.data?.message || 'Google Sign-Up failed');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  onError={() => {
                    toast.error('Google Sign-Up was cancelled or failed');
                  }}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="signup_with"
                  shape="pill"
                  width="100%"
                />
              </div>
            </>
          )}

          <p className="text-center text-sm text-text-secondary mt-6">
            Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
