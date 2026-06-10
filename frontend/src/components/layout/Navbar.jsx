import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiShoppingCart, FiBell, FiUser, FiMenu, FiX, FiLogOut, FiHeart, FiPackage, FiMapPin } from 'react-icons/fi';
import { selectCartCount } from '../../store/cartSlice';
import { toggleNotifications } from '../../store/notificationSlice';
import { logout } from '../../store/authSlice';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const cartCount = useSelector(selectCartCount);
  const { unreadCount } = useSelector((s) => s.notifications);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setProfileOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <img src="/logo.png" alt="Shifa Store" className="w-9 h-9 rounded-full" />
              <span className="text-xl font-bold text-gradient hidden sm:block">Shifa Store</span>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <form onSubmit={handleSearch} className="w-full relative">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search for groceries, essentials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.75rem' }}
                  className="w-full pr-4 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all"
                />
              </form>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Search mobile toggle */}
              <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden p-2.5 rounded-xl hover:bg-bg-secondary transition-colors">
                <FiSearch className="w-5 h-5 text-text-secondary" />
              </button>

              {/* Notifications */}
              {isAuthenticated && (
                <button onClick={() => dispatch(toggleNotifications())} className="relative p-2.5 rounded-xl hover:bg-bg-secondary transition-colors">
                  <FiBell className="w-5 h-5 text-text-secondary" />
                  {unreadCount > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-error text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </button>
              )}

              {/* Cart */}
              <Link to="/cart" className="relative p-2.5 rounded-xl hover:bg-bg-secondary transition-colors">
                <FiShoppingCart className="w-5 h-5 text-text-secondary" />
                {cartCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 w-5 h-5 gradient-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {cartCount > 9 ? '9+' : cartCount}
                  </motion.span>
                )}
              </Link>

              {/* Premium Visual Divider */}
              <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block"></div>

              {/* Profile / Login */}
              {isAuthenticated ? (
                <div className="relative" ref={profileRef}>
                  <button onClick={() => setProfileOpen(!profileOpen)} className="p-2 rounded-xl hover:bg-bg-secondary transition-colors flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-text max-w-[100px] truncate">{user?.name || 'User'}</span>
                  </button>
                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-border/50 py-2 z-50">
                        <div className="px-4 py-3 border-b border-border/50">
                          <p className="text-sm font-semibold text-text truncate">{user?.name}</p>
                          <p className="text-xs text-text-secondary truncate">{user?.email || user?.phone}</p>
                        </div>
                        <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-bg-secondary transition-colors"><FiUser className="w-4 h-4" /> My Profile</Link>
                        <Link to="/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-bg-secondary transition-colors"><FiPackage className="w-4 h-4" /> My Orders</Link>
                        <Link to="/wishlist" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-bg-secondary transition-colors"><FiHeart className="w-4 h-4" /> Wishlist</Link>
                        <Link to="/addresses" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-bg-secondary transition-colors"><FiMapPin className="w-4 h-4" /> Addresses</Link>
                        <hr className="my-1 border-border/50" />
                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-red-50 w-full transition-colors"><FiLogOut className="w-4 h-4" /> Logout</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" className="px-4 py-2 gradient-primary text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden border-t border-border/30">
              <form onSubmit={handleSearch} className="p-3">
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                  <input
                    type="text" autoFocus placeholder="Search for groceries..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.75rem' }}
                    className="w-full pr-4 py-2.5 bg-bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navbar;
