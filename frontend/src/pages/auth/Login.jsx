import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiX, FiKey, FiMapPin } from 'react-icons/fi';
import { authService } from '../../services/authService';
import { loginSuccess } from '../../store/authSlice';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import LocationModal from '../../components/layout/LocationModal';

const Login = () => {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState('customer');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const { activeBranch } = useSelector((s) => s.branch);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleForgotPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your mobile number or email');
      return;
    }
    setForgotLoading(true);
    try {
      const isEmail = /^\S+@\S+\.\S+$/.test(forgotEmail.trim());
      const payload = isEmail ? { email: forgotEmail.trim() } : { phone: forgotEmail.trim() };

      const response = await authService.forgotPassword(payload);
      toast.success(response.data?.message || 'Verification OTP sent successfully!');
      setForgotStep(2);
      setResendTimer(30);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!forgotOtp || !forgotNewPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setForgotLoading(true);
    try {
      const isEmail = /^\S+@\S+\.\S+$/.test(forgotEmail.trim());
      const payload = isEmail 
        ? { email: forgotEmail.trim(), otp: forgotOtp.trim(), newPassword: forgotNewPassword }
        : { phone: forgotEmail.trim(), otp: forgotOtp.trim(), newPassword: forgotNewPassword };

      const response = await authService.resetPassword(payload);
      toast.success(response.data?.message || 'Password reset successful!');
      setShowForgotModal(false);
      // Reset state
      setForgotStep(1);
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPassword('');
      setResendTimer(0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);
    const cleanValues = {
      ...values,
      phone: values.phone ? values.phone.replace(/\s+/g, '') : values.phone
    };
    try {
      let res;
      if (loginType === 'customer') {
        res = await authService.loginEmail(cleanValues);
        const loggedUser = res.data.customer;
        dispatch(loginSuccess({ user: loggedUser, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
        if (loggedUser?.role === 'Admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      } else if (loginType === 'shopowner') {
        res = await authService.loginShopOwner(cleanValues);
        dispatch(loginSuccess({ user: res.data.shopOwner, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
        navigate('/shop/dashboard');
      } else if (loginType === 'delivery') {
        res = await authService.loginDeliveryPartner(cleanValues);
        dispatch(loginSuccess({ user: res.data.deliveryPartner, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
        navigate('/delivery/dashboard');
      }
      toast.success('Welcome back!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <motion.div key={i} animate={{ y: [0, -20, 0], x: [0, 10, 0] }} transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-20 h-20 rounded-full bg-white/20" style={{ top: `${20 + i * 12}%`, left: `${10 + i * 15}%` }} />
          ))}
        </div>
        <div className="relative text-center text-white z-10">
          <motion.img src="/logo.png" alt="Shifa Store" className="w-24 h-24 rounded-3xl mx-auto shadow-2xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} />
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-4xl font-extrabold mt-6">Shifa Store</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-white/80 mt-3 text-lg">Fresh groceries at your doorstep</motion.p>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="Shifa Store" className="w-16 h-16 rounded-2xl mx-auto" />
            <h2 className="text-2xl font-bold text-text mt-3">Shifa Store</h2>
          </div>

          <h2 className="text-2xl font-bold text-text">Welcome Back 👋</h2>
          <p className="text-text-secondary text-sm mt-1 mb-6">Sign in to your account</p>

          {/* Login Type Tabs */}
          <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 mb-8">
            {[{ key: 'customer', label: 'Customer' }, { key: 'shopowner', label: 'Shop Owner' }, { key: 'delivery', label: 'Delivery' }].map((t) => (
              <button key={t.key} onClick={() => setLoginType(t.key)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${loginType === t.key ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Branch / Location Selector */}
          <div className="mb-6 p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FiMapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">Current Branch / Zone</p>
                <p className="text-sm font-bold text-text mt-0.5">
                  {activeBranch?.name || 'No Branch Selected'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-xs font-semibold text-primary rounded-lg border border-slate-100 shadow-sm transition-all"
            >
              Change
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Mobile Number</label>
              <div className="relative">
                <FiPhone className="absolute left-4.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4 z-10" />
                <input {...register('phone', { 
                  required: 'Mobile number is required', 
                  validate: (val) => {
                    const cleaned = val ? val.replace(/\s+/g, '') : '';
                    const isPhone = /^\+?\d{10,15}$/.test(cleaned);
                    const isEmail = /^\S+@\S+\.\S+$/.test(cleaned);
                    return (isPhone || isEmail) || 'Invalid mobile number or email format';
                  }
                })}
                  type="text" placeholder="Enter your mobile number"
                  className="w-full login-input bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
              </div>
              {errors.phone && <p className="text-error text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail('');
                    setForgotOtp('');
                    setForgotNewPassword('');
                    setForgotStep(1);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-primary hover:underline transition-all cursor-pointer focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <FiLock className="absolute left-4.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4 pointer-events-none z-10" />
                <input {...register('password', { required: 'Password is required' })}
                  type={showPwd ? 'text' : 'password'} placeholder="Enter your password"
                  className="w-full login-input bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
                <span
                  onTouchEnd={(e) => { e.preventDefault(); setShowPwd(!showPwd); }}
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-text-tertiary cursor-pointer select-none z-10">
                  {showPwd ? <FiEyeOff className="w-4 h-4 pointer-events-none" /> : <FiEye className="w-4 h-4 pointer-events-none" />}
                </span>
              </div>
              {errors.password && <p className="text-error text-xs mt-1">{errors.password.message}</p>}
            </div>

            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
              className="w-full py-3.5 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
            </motion.button>
          </form>

          {loginType === 'customer' && (
            <>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <span className="relative px-3 bg-white text-xs font-semibold text-text-tertiary uppercase tracking-wider">Or continue with</span>
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
                        toast.error(err.response?.data?.message || 'Google Sign-In failed');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  onError={() => {
                    toast.error('Google Sign-In was cancelled or failed');
                  }}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="pill"
                  width="100%"
                />
              </div>
            </>
          )}

          <p className="text-center text-sm text-text-secondary mt-6">
            Don't have an account?{' '}
            <Link to={`/signup?role=${loginType}`} className="text-primary font-semibold hover:underline">
              {loginType === 'customer'
                ? 'Sign Up'
                : loginType === 'shopowner'
                ? 'Register as Shop Owner'
                : 'Register as Delivery Partner'}
            </Link>
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          >
            {/* Modal Backdrop click to close */}
            <div
              className="absolute inset-0 cursor-default"
              onClick={() => setShowForgotModal(false)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-border/40 z-10 p-8"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 text-text-secondary hover:text-text p-1.5 rounded-lg hover:bg-bg-secondary transition-all cursor-pointer focus:outline-none"
              >
                <FiX className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-text">Reset Password</h3>
                <p className="text-text-secondary text-sm mt-1">
                  {forgotStep === 1
                    ? 'Enter your mobile number or email to receive a verification OTP via SMS or Email.'
                    : 'Enter the 6-digit verification OTP and your new password.'}
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Mobile Number or Email</label>
                    <div className="relative">
                      <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                      <input
                        type="text"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Enter mobile number or email"
                        className="w-full pl-11 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3.5 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Send Verification Code'
                    )}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Verification OTP Code</label>
                    <div className="relative">
                      <FiKey className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="w-full pl-11 pr-4 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all tracking-widest text-center font-bold text-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">New Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                      <input
                        type={showForgotPwd ? 'text' : 'password'}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full pl-11 pr-10 py-3 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPwd(!showForgotPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text cursor-pointer focus:outline-none"
                      >
                        {showForgotPwd ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
                    <span>Didn't receive the code?</span>
                    <button
                      type="button"
                      disabled={resendTimer > 0 || forgotLoading}
                      onClick={() => handleForgotPasswordSubmit()}
                      className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer focus:outline-none"
                    >
                      {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                    </button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="flex-1 py-3.5 border border-border rounded-xl text-sm font-semibold text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer focus:outline-none"
                    >
                      Back
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-3.5 gradient-primary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {forgotLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Reset Password'
                      )}
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LocationModal isOpen={locationModalOpen} onClose={() => setLocationModalOpen(false)} />
    </div>
  );
};

export default Login;
