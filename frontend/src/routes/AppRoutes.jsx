import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Spinner } from '../components/ui/Loaders';

// Layouts
import CustomerLayout from '../layouts/CustomerLayout';

// Lazy loaded pages
const Home = lazy(() => import('../pages/customer/Home'));
const Login = lazy(() => import('../pages/auth/Login'));
const Signup = lazy(() => import('../pages/auth/Signup'));
const Category = lazy(() => import('../pages/customer/Category'));
const Cart = lazy(() => import('../pages/customer/Cart'));
const Checkout = lazy(() => import('../pages/customer/Checkout'));
const Orders = lazy(() => import('../pages/customer/Orders'));
const OrderTracking = lazy(() => import('../pages/customer/OrderTracking'));
const Profile = lazy(() => import('../pages/customer/Profile'));
const Search = lazy(() => import('../pages/customer/Search'));
const Wishlist = lazy(() => import('../pages/customer/Wishlist'));

// Shop Owner
const ShopDashboard = lazy(() => import('../pages/shop/Dashboard'));
const ShopProducts = lazy(() => import('../pages/shop/Products'));

// Delivery
const DeliveryDashboard = lazy(() => import('../pages/delivery/Dashboard'));

// Admin
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useSelector((s) => s.auth);
  if (loading || (isAuthenticated && !user)) {
    return <LoadFallback />;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const CustomerRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useSelector((s) => s.auth);

  if (loading || (isAuthenticated && !user)) {
    return <LoadFallback />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'ShopOwner') return <Navigate to="/shop/dashboard" replace />;
    if (user.role === 'DeliveryPartner') return <Navigate to="/delivery/dashboard" replace />;
    if (user.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

const LoadFallback = () => <Spinner className="py-20" />;

const AppRoutes = () => (
  <Suspense fallback={<LoadFallback />}>
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Customer Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<CustomerRoute><Home /></CustomerRoute>} />
        <Route path="/category/:categoryId" element={<CustomerRoute><Category /></CustomerRoute>} />
        <Route path="/search" element={<CustomerRoute><Search /></CustomerRoute>} />
        <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
        <Route path="/wishlist" element={<CustomerRoute><Wishlist /></CustomerRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><CustomerRoute><Checkout /></CustomerRoute></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><CustomerRoute><Orders /></CustomerRoute></ProtectedRoute>} />
        <Route path="/order-tracking/:orderId" element={<ProtectedRoute><CustomerRoute><OrderTracking /></CustomerRoute></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><CustomerRoute><Profile /></CustomerRoute></ProtectedRoute>} />
        <Route path="/addresses" element={<ProtectedRoute><CustomerRoute><Profile /></CustomerRoute></ProtectedRoute>} />
      </Route>

      {/* Shop Owner Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/shop/dashboard" element={<ProtectedRoute roles={['ShopOwner']}><ShopDashboard /></ProtectedRoute>} />
        <Route path="/shop/products" element={<ProtectedRoute roles={['ShopOwner']}><ShopProducts /></ProtectedRoute>} />
      </Route>

      {/* Delivery Partner Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/delivery/dashboard" element={<ProtectedRoute roles={['DeliveryPartner']}><DeliveryDashboard /></ProtectedRoute>} />
      </Route>

      {/* Admin Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
      </Route>

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
