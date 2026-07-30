import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiShoppingCart, FiBell, FiUser, FiMenu, FiX, FiLogOut, FiHeart, FiPackage, FiMapPin, FiInfo, FiChevronDown } from 'react-icons/fi';
import { selectCartCount } from '../../store/cartSlice';
import { toggleNotifications } from '../../store/notificationSlice';
import { logout } from '../../store/authSlice';
import LocationModal from './LocationModal';

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
  const { activeBranch } = useSelector((s) => s.branch);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const getHomeLink = () => {
    if (!isAuthenticated || !user) return "/";
    if (user.role === 'ShopOwner') return "/shop/dashboard";
    if (user.role === 'DeliveryPartner') return "/delivery/dashboard";
    if (user.role === 'Admin') return "/admin/dashboard";
    return "/";
  };

  const isCustomerOrGuest = !isAuthenticated || user?.role === 'Customer';

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
            {/* Logo & Location Container */}
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
              {/* Logo */}
              <Link to={getHomeLink()} className="flex items-center gap-2 shrink-0">
                <img src="/logo.png" alt="Shifa Store" className="w-9 h-9 rounded-full shadow-xs" />
                <span className="text-xl font-extrabold text-gradient hidden sm:block">Shifa Store</span>
              </Link>

              {/* Location Selector Pill */}
              {isCustomerOrGuest && (
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-full transition-all cursor-pointer group text-left max-w-[150px] sm:max-w-[200px]"
                >
                  <FiMapPin className="text-primary w-3.5 h-3.5 shrink-0 animate-pulse" />
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <span className="text-[8px] text-primary font-black uppercase tracking-wider">Area / Branch</span>
                    <span className="text-[11px] font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                      {activeBranch?.name || 'Select Branch'}
                    </span>
                  </div>
                  <FiChevronDown className="text-primary/70 w-3 h-3 shrink-0 ml-0.5" />
                </button>
              )}
            </div>

            {/* Search Bar - Desktop */}
            {isCustomerOrGuest && (
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
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Search mobile toggle */}
              {isCustomerOrGuest && (
                <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden p-2.5 rounded-xl hover:bg-bg-secondary transition-colors">
                  <FiSearch className="w-5 h-5 text-text-secondary" />
                </button>
              )}

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
              {isCustomerOrGuest && (
                <Link to="/cart" className="relative p-2.5 rounded-xl hover:bg-bg-secondary transition-colors">
                  <FiShoppingCart className="w-5 h-5 text-text-secondary" />
                  {cartCount > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-0.5 -right-0.5 w-5 h-5 gradient-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                      {cartCount > 9 ? '9+' : cartCount}
                    </motion.span>
                  )}
                </Link>
              )}

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
                        <Link to="/about" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-bg-secondary transition-colors"><FiInfo className="w-4 h-4" /> About Us</Link>
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

      <LocationModal isOpen={locationModalOpen} onClose={() => setLocationModalOpen(false)} />
    </>
  );
};

export default Navbar;
