export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || 'AIzaSyArKycpLCYuP6XtA_znLz4Tt_gg1hsLsfk';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '768773895387-t43up2am200fapr272d44d0e14l7noh0.apps.googleusercontent.com';

export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ASSIGNED: 'assigned',
  ACCEPTED_BY_RIDER: 'acceptedByRider',
  PICKED_UP: 'pickedUp',
  OUT_FOR_DELIVERY: 'outForDelivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  CONFIRMED: 'confirmed',
  AVAILABLE: 'available',
  ARRIVING: 'arriving',
};

export const ORDER_STATUS_LABELS = {
  pending: 'Order Placed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  assigned: 'Rider Assigned',
  acceptedByRider: 'Rider Accepted',
  pickedUp: 'Picked Up',
  outForDelivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  available: 'Available',
  arriving: 'Arriving',
};

export const ORDER_TRACKING_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: '📦' },
  { key: 'accepted', label: 'Shop Accepted', icon: '✅' },
  { key: 'available', label: 'Finding Rider', icon: '🔍' },
  { key: 'acceptedByRider', label: 'Rider On Way to Shop', icon: '🏃' },
  { key: 'pickedUp', label: 'Picked Up from Shop', icon: '🛍️' },
  { key: 'outForDelivery', label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

export const USER_ROLES = {
  CUSTOMER: 'Customer',
  SHOP_OWNER: 'ShopOwner',
  DELIVERY_PARTNER: 'DeliveryPartner',
  ADMIN: 'Admin',
};

export const COLORS = {
  primary: '#FF7A00',
  primaryLight: '#FF9A33',
  primaryDark: '#E56E00',
  secondary: '#FFC400',
  accent: '#FF9A1F',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  bg: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
};

// Demo data for when database is empty
export const DEMO_SHOPS = [
  { name: 'Shifa Store', rating: 4.8, deliveryTime: '15-20 min', image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400' },
  { name: 'Fresh Mart', rating: 4.5, deliveryTime: '20-30 min', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400' },
  { name: 'Grocery Hub', rating: 4.3, deliveryTime: '25-35 min', image: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=400' },
  { name: 'Family Bazaar', rating: 4.6, deliveryTime: '15-25 min', image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400' },
  { name: 'Daily Needs', rating: 4.4, deliveryTime: '20-30 min', image: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400' },
];

export const DEMO_PRODUCTS = [
  { name: 'Basmati Rice', price: 180, discountPrice: 220, quantity: '1 kg', image: 'https://m.media-amazon.com/images/I/71zVdENpKDL._AC_UL640_QL65_.jpg', category: 'Ata, Rice & Dal', rating: 4.5, stock: 50, deliveryTime: '15 min' },
  { name: 'Sattu', price: 120, discountPrice: 150, quantity: '500 g', image: 'https://m.media-amazon.com/images/I/71eGjxkT-EL._AC_UL640_QL65_.jpg', category: 'Ata, Rice & Dal', rating: 4.3, stock: 30, deliveryTime: '15 min' },
  { name: 'Besan', price: 85, discountPrice: 100, quantity: '500 g', image: 'https://m.media-amazon.com/images/I/71yzlnMbZOL._AC_UL640_QL65_.jpg', category: 'Ata, Rice & Dal', rating: 4.4, stock: 45, deliveryTime: '15 min' },
  { name: 'Wheat Flour', price: 250, discountPrice: 290, quantity: '5 kg', image: 'https://m.media-amazon.com/images/I/71GfLrP5QcL._AC_UL640_QL65_.jpg', category: 'Ata, Rice & Dal', rating: 4.7, stock: 60, deliveryTime: '15 min' },
  { name: 'Mustard Oil', price: 190, discountPrice: 220, quantity: '1 L', image: 'https://m.media-amazon.com/images/I/61fTm0gYtyL._AC_UL640_QL65_.jpg', category: 'Vegetables & Fruits', rating: 4.2, stock: 35, deliveryTime: '20 min' },
  { name: 'Sunflower Oil', price: 160, discountPrice: 180, quantity: '1 L', image: 'https://m.media-amazon.com/images/I/71HjBDnbILL._AC_UL640_QL65_.jpg', category: 'Vegetables & Fruits', rating: 4.1, stock: 40, deliveryTime: '20 min' },
  { name: 'Amul Milk', price: 34, discountPrice: 38, quantity: '500 ml', image: 'https://m.media-amazon.com/images/I/812816L+HkL._AC_UL640_QL65_.jpg', category: 'Milk, Curd & Paneer', rating: 4.8, stock: 100, deliveryTime: '10 min' },
  { name: 'Bread', price: 35, discountPrice: 40, quantity: '400 g', image: 'https://m.media-amazon.com/images/I/71dpKUWhfmL._AC_UL640_QL65_.jpg', category: 'Milk, Curd & Paneer', rating: 4.3, stock: 80, deliveryTime: '10 min' },
  { name: 'Eggs', price: 85, discountPrice: 95, quantity: '12 pcs', image: 'https://m.media-amazon.com/images/I/71jJwbXFYCL._AC_UL640_QL65_.jpg', category: 'Milk, Curd & Paneer', rating: 4.6, stock: 70, deliveryTime: '15 min' },
  { name: 'Tea', price: 220, discountPrice: 260, quantity: '250 g', image: 'https://m.media-amazon.com/images/I/71V-bKFcyaL._AC_UL640_QL65_.jpg', category: 'Munchies', rating: 4.5, stock: 55, deliveryTime: '15 min' },
  { name: 'Coffee', price: 310, discountPrice: 350, quantity: '200 g', image: 'https://m.media-amazon.com/images/I/71Z5GnNK5cL._AC_UL640_QL65_.jpg', category: 'Munchies', rating: 4.4, stock: 25, deliveryTime: '15 min' },
  { name: 'Sugar', price: 48, discountPrice: 55, quantity: '1 kg', image: 'https://m.media-amazon.com/images/I/71MjUHp+mSL._AC_UL640_QL65_.jpg', category: 'Ata, Rice & Dal', rating: 4.2, stock: 90, deliveryTime: '10 min' },
  { name: 'Soap', price: 45, discountPrice: 55, quantity: '4 pcs', image: 'https://m.media-amazon.com/images/I/61S5b9YgZSL._AC_UL640_QL65_.jpg', category: 'Cleaning Essentials', rating: 4.1, stock: 65, deliveryTime: '15 min' },
  { name: 'Shampoo', price: 210, discountPrice: 250, quantity: '340 ml', image: 'https://m.media-amazon.com/images/I/61qkJ+VnUfL._AC_UL640_QL65_.jpg', category: 'Pharma & Wellness', rating: 4.3, stock: 40, deliveryTime: '20 min' },
  { name: 'Toothpaste', price: 95, discountPrice: 110, quantity: '150 g', image: 'https://m.media-amazon.com/images/I/61rn05MH8fL._AC_UL640_QL65_.jpg', category: 'Pharma & Wellness', rating: 4.5, stock: 75, deliveryTime: '15 min' },
  { name: 'Detergent', price: 155, discountPrice: 180, quantity: '1 kg', image: 'https://m.media-amazon.com/images/I/71m0bHN7eAL._AC_UL640_QL65_.jpg', category: 'Cleaning Essentials', rating: 4.0, stock: 50, deliveryTime: '20 min' },
];

export const HERO_BANNERS = [
  { id: 1, title: 'Fresh Groceries', subtitle: 'Delivered in 10 minutes', gradient: 'from-orange-500 to-yellow-400', emoji: '🥬' },
  { id: 2, title: 'Up to 50% OFF', subtitle: 'On daily essentials', gradient: 'from-green-500 to-emerald-400', emoji: '🎉' },
  { id: 3, title: 'Free Delivery', subtitle: 'On orders above ₹499', gradient: 'from-blue-500 to-cyan-400', emoji: '🚀' },
];

export const FLASH_SALE_ITEMS = [
  { name: 'Amul Butter', price: 55, originalPrice: 65, discount: 15, image: 'https://m.media-amazon.com/images/I/71Nd0C42xRL._AC_UL640_QL65_.jpg', timeLeft: '2h 30m' },
  { name: 'Maggi Noodles', price: 14, originalPrice: 16, discount: 12, image: 'https://m.media-amazon.com/images/I/81cLmCVFsRL._AC_UL640_QL65_.jpg', timeLeft: '1h 15m' },
  { name: 'Parle-G Biscuit', price: 10, originalPrice: 12, discount: 17, image: 'https://m.media-amazon.com/images/I/71OvlC80FTL._AC_UL640_QL65_.jpg', timeLeft: '3h 00m' },
  { name: 'Tata Salt', price: 25, originalPrice: 28, discount: 11, image: 'https://m.media-amazon.com/images/I/61Bz4zP6YpL._AC_UL640_QL65_.jpg', timeLeft: '45m' },
];
