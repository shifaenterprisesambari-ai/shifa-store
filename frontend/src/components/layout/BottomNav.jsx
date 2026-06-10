import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiSearch, FiShoppingCart, FiHeart, FiUser } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectCartCount } from '../../store/cartSlice';

const tabs = [
  { to: '/', icon: FiHome, label: 'Home' },
  { to: '/search', icon: FiSearch, label: 'Search' },
  { to: '/cart', icon: FiShoppingCart, label: 'Cart', badge: true },
  { to: '/wishlist', icon: FiHeart, label: 'Wishlist' },
  { to: '/profile', icon: FiUser, label: 'Profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const cartCount = useSelector(selectCartCount);
  const { user, isAuthenticated } = useSelector((s) => s.auth);

  // Hide on certain routes
  const hideOn = ['/login', '/signup', '/order-tracking'];
  if (hideOn.some((p) => location.pathname.startsWith(p))) return null;

  // Hide for non-customer roles (ShopOwner, DeliveryPartner, Admin)
  if (isAuthenticated && user && user.role !== 'Customer') return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass border-t border-border/30">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.to || (tab.to !== '/' && location.pathname.startsWith(tab.to));
            const Icon = tab.icon;
            return (
              <NavLink key={tab.to} to={tab.to} className="relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors">
                {isActive && (
                  <motion.div layoutId="bottomTab" className="absolute inset-0 bg-primary/10 rounded-xl" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-text-tertiary'}`} />
                  {tab.badge && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 w-4 h-4 gradient-primary text-white text-[9px] font-bold flex items-center justify-center rounded-full">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? 'text-primary' : 'text-text-tertiary'}`}>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
