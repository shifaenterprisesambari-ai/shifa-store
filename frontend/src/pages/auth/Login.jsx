import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FiMail, FiLock, FiEye, FiEyeOff, FiX, FiKey } from 'react-icons/fi';
import { authService } from '../../services/authService';
import { loginSuccess } from '../../store/authSlice';
import toast from 'react-hot-toast';

const Login = () => {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState('customer');
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

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email');
      return;
    }
    setForgotLoading(true);
    try {
      const response = await authService.forgotPassword(forgotEmail);
      toast.success(response.data?.message || 'Verification OTP sent successfully!');
      console.log('Forgot Password OTP:', response.data?.otp);
      setForgotStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotOtp || !forgotNewPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setForgotLoading(true);
    try {
      const response = await authService.resetPassword(forgotEmail, forgotOtp, forgotNewPassword);
      toast.success(response.data?.message || 'Password reset successful!');
      setShowForgotModal(false);
      // Reset state
      setForgotStep(1);
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      let res;
      if (loginType === 'customer') {
        res = await authService.loginEmail(values);
        dispatch(loginSuccess({ user: res.data.customer, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
        navigate('/');
      } else if (loginType === 'shopowner') {
        res = await authService.loginShopOwner(values);
        dispatch(loginSuccess({ user: res.data.shopOwner, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
        navigate('/shop/dashboard');
      } else if (loginType === 'delivery') {
        res = await authService.loginDeliveryPartner(values);
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Email</label>
              <div className="relative">
                <FiMail className="absolute left-4.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4 z-10" />
                <input {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
                  type="email" placeholder="Enter your email"
                  className="w-full login-input bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
              </div>
              {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                {loginType === 'customer' && (
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
                )}
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
              {/* <div className="flex items-center gap-3 my-6">
                <hr className="flex-1 border-border" />
                <span className="text-xs text-text-tertiary">OR</span>
                <hr className="flex-1 border-border" />
              </div>

              <button className="w-full py-3 border border-border rounded-xl text-sm font-medium text-text hover:bg-bg-secondary transition-colors flex items-center justify-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button> */}

              <p className="text-center text-sm text-text-secondary mt-6">
                Don't have an account? <Link to="/signup" className="text-primary font-semibold hover:underline">Sign Up</Link>
              </p>
            </>
          )}
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
                    ? 'Enter your email to receive a verification OTP.'
                    : 'Enter the verification OTP and your new password.'}
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Email Address</label>
                    <div className="relative">
                      <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="yourname@example.com"
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

                  <div className="flex gap-3">
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
    </div>
  );
};

export default Login;
