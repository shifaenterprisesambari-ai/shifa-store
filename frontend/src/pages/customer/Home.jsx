import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiClock, FiZap, FiTruck, FiX } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { addToCart } from '../../store/cartSlice';
import toast from 'react-hot-toast';
import { productService } from '../../services/productService';
import ProductCard from '../../components/ProductCard';
import { Spinner, SkeletonList, SkeletonCategoryRow } from '../../components/ui/Loaders';
import { HERO_BANNERS, DEMO_PRODUCTS, DEMO_SHOPS, FLASH_SALE_ITEMS } from '../../constants';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [productsByCategory, setProductsByCategory] = useState({});
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);

  // Store Catalog overlay states
  const [activeStore, setActiveStore] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    loadData();
    const interval = setInterval(() => setActiveBanner((p) => (p + 1) % HERO_BANNERS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const { data: cats } = await productService.getCategories();
      setCategories(cats);

      // Load real branches (stores)
      try {
        const { data: realStores } = await productService.getStores();
        setStores(realStores);
      } catch (e) {
        console.error('Failed to load stores:', e);
      }

      // Load products for each category
      const productsMap = {};
      await Promise.all(
        cats.map(async (cat) => {
          try {
            const { data } = await productService.getProductsByCategory(cat._id);
            productsMap[cat._id] = data;
          } catch { productsMap[cat._id] = []; }
        })
      );
      setProductsByCategory(productsMap);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreClick = async (store) => {
    setActiveStore(store);
    setLoadingStoreProducts(true);
    try {
      const { data } = await productService.getStoreProducts(store._id);
      setStoreProducts(data);
    } catch (e) {
      console.error('Failed to load store products:', e);
      toast.error('Failed to load store products');
      setStoreProducts([]);
    } finally {
      setLoadingStoreProducts(false);
    }
  };

  const allProducts = Object.values(productsByCategory).flat();
  const hasProducts = allProducts.length > 0;

  // Enrich database stores with a fallback rating and image if not set
  const activeStores = (stores && stores.length > 0 ? stores : DEMO_SHOPS).map((shop, i) => ({
    ...shop,
    rating: shop.rating || [4.8, 4.5, 4.3, 4.6, 4.4][i % 5],
    image: shop.image || [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=400',
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400',
      'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400'
    ][i % 5]
  }));

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Hero Banner */}
      <section className="px-2.5 sm:px-4 pt-2 sm:pt-6">
        <div className="relative overflow-hidden rounded-lg sm:rounded-lg shadow-xl shadow-orange-500/5">
          <motion.div
            key={activeBanner}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.5 }}
            className={`w-full h-[240px] sm:h-[320px] px-8 sm:px-16 bg-gradient-to-r ${HERO_BANNERS[activeBanner].gradient} flex items-center relative overflow-hidden`}
          >
            {/* SVG Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0c_1px,transparent_1px)] bg-[size:14px_24px] opacity-40 z-0" />
            
            {/* Glowing blur circles */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                x: [0, 10, 0],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -right-8 -top-8 w-44 h-44 bg-white/20 rounded-full blur-3xl z-0"
            />
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                x: [0, -15, 0],
                y: [0, 10, 0],
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/10 rounded-full blur-2xl z-0"
            />

            <div className="flex items-center justify-between w-full relative z-10">
              <div className="flex flex-col items-center text-center sm:items-start sm:text-left max-w-xs sm:max-w-md mx-auto sm:mx-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md text-[10px] sm:text-xs font-black text-white rounded-full border border-white/20 shadow-sm uppercase tracking-widest"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
                  ⚡ Shifa Special Offer
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl sm:text-5xl font-black text-white mt-4 tracking-tight leading-none drop-shadow-md"
                >
                  {HERO_BANNERS[activeBanner].title}
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/90 text-xs sm:text-lg mt-2.5 font-medium tracking-wide drop-shadow-sm"
                >
                  {HERO_BANNERS[activeBanner].subtitle}
                </motion.p>
                
                {/* Wrapper div with inline style guarantees the button never stretches */}
                <div style={{ width: 'max-content', marginTop: '18px' }}>
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.05, boxShadow: '0 8px 20px -8px rgba(255,255,255,0.45)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/search')}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-white hover:bg-yellow-50 text-gray-950 font-black text-xs sm:text-sm rounded-md sm:rounded-lg shadow-md cursor-pointer inline-flex items-center gap-1.5 transition-all group"
                  >
                    Shop Now 
                    <FiArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>
                </div>
              </div>
              
              <motion.span
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  y: [0, -10, 0],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{
                  scale: { delay: 0.2, type: 'spring' },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                }}
                className="text-7xl sm:text-9xl hidden sm:block select-none filter drop-shadow-2xl cursor-pointer"
              >
                {HERO_BANNERS[activeBanner].emoji}
              </motion.span>
            </div>
          </motion.div>
          {/* Dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 z-20 shadow-lg">
            {HERO_BANNERS.map((_, i) => (
              <span
                key={i}
                role="button"
                onClick={() => setActiveBanner(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer inline-block ${i === activeBanner ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="h-10 sm:h-14 w-full" />
      {/* Quick Info Bar */}
      <section className="px-2.5 sm:px-4">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-1">
          {[
            { icon: <FiZap className="w-4 h-4 text-primary" />, text: '10 Min Delivery' },
            { icon: <FiTruck className="w-4 h-4 text-success" />, text: 'Free above ₹199' },
            { icon: <FiClock className="w-4 h-4 text-info" />, text: 'Best Prices' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-xl text-xs font-medium text-text-secondary whitespace-nowrap shrink-0">
              {item.icon} {item.text}
            </div>
          ))}
        </div>
      </section>

      <div className="h-10 sm:h-14 w-full" />
      {/* Categories */}
      <section className="px-2.5 sm:px-4">
        <h2 className="text-lg font-bold text-text mb-4">Shop by Category</h2>
        {loading ? <SkeletonCategoryRow /> : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat, i) => (
              <motion.div
                key={cat._id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to={`/category/${cat._id}`} className="flex flex-col items-center gap-2 min-w-[76px]">
                  <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-gradient-to-b from-orange-50 to-orange-100 border border-orange-100 flex items-center justify-center overflow-hidden p-2 hover:shadow-md transition-shadow">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" loading="lazy" />
                  </div>
                  <span className="text-[11px] font-medium text-text-secondary text-center leading-tight max-w-[72px] line-clamp-2">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <div className="h-14 sm:h-20 w-full" />
      {/* Deals - Premium Improved Section */}
      <section className="px-2.5 sm:px-4">
        <div className="bg-gradient-to-br from-orange-500/8 via-red-500/4 to-transparent px-3.5 py-5 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-100/50">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span className="text-xl animate-bounce">⚡</span>
              <div>
                <h2 className="text-lg font-black text-text tracking-tight flex items-center gap-2">
                  Deals <span className="text-error font-black animate-pulse">LIVE</span>
                </h2>
                <p className="text-[10px] text-text-secondary font-medium">Top offers, ending soon!</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-100 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
              <span className="text-[10px] text-error font-extrabold uppercase tracking-wider">04h : 18m : 42s</span>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {(allProducts.length > 0 ? allProducts : FLASH_SALE_ITEMS).map((item, i) => {
              const soldPercent = [78, 45, 88, 62][i % 4];
              const salePrice = item.price;
              const originalPrice = item.discountPrice || item.originalPrice || Math.round(item.price * 1.25);
              const discount = item.discount || Math.round(((originalPrice - salePrice) / originalPrice) * 100);
              const cartProduct = {
                ...item,
                _id: item._id || `flash-${i}`,
                id: item.id || item._id || `flash-${i}`,
                quantity: item.quantity || '1 unit',
              };
              return (
                <motion.div
                  key={item._id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="min-w-[185px] sm:min-w-[205px] bg-white rounded-2xl border border-orange-100/60 p-3.5 shadow-sm hover:shadow-md hover:border-orange-200/80 transition-all cursor-pointer relative flex flex-col justify-between"
                >
                  <div>
                    {/* Badge & Image */}
                    <div className="relative mb-3 flex items-center justify-center bg-bg-secondary rounded-xl p-2.5 h-28 overflow-hidden">
                      {discount > 0 && (
                        <div className="absolute top-1 left-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-extrabold rounded-lg shadow-sm z-10">
                          {discount}% OFF
                        </div>
                      )}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { e.target.src = '/logo.png'; }}
                      />
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-bold text-text line-clamp-1 pr-1">{item.name}</h4>
                    
                    {/* Price and Timer */}
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="text-sm font-extrabold text-text">₹{salePrice}</span>
                      {originalPrice > salePrice && (
                        <span className="text-[10px] text-text-tertiary line-through font-medium">₹{originalPrice}</span>
                      )}
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[9px] font-bold text-text-secondary mb-1">
                        <span>🔥 {soldPercent}% Sold</span>
                        <span className="text-error font-extrabold">Urgent</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                          style={{ width: `${soldPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-dashed border-gray-100 flex items-center justify-between">
                    <span className="text-[9px] text-error font-extrabold flex items-center gap-0.5 uppercase">⏰ {item.timeLeft || '15 mins'}</span>
                    <button
                      onClick={() => {
                        dispatch(addToCart(cartProduct));
                        toast.success(`${item.name} added to cart!`);
                      }}
                      className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-dark hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="text-lg font-black leading-none">+</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products by Category */}
      {loading ? (
        <section className="px-2 sm:px-4 mt-10">
          <SkeletonList count={8} />
        </section>
      ) : (
        categories.slice(0, 4).map((cat) => {
          const products = productsByCategory[cat._id] || [];
          if (products.length === 0) return null;
          
          // Custom category emoji picker
          const getCategoryEmoji = (name) => {
            const lower = name.toLowerCase();
            if (lower.includes('fruit') || lower.includes('veg')) return '🥦';
            if (lower.includes('dairy') || lower.includes('milk') || lower.includes('bread')) return '🥛';
            if (lower.includes('snack') || lower.includes('chips')) return '🍪';
            if (lower.includes('beverage') || lower.includes('drink') || lower.includes('juice')) return '🥤';
            if (lower.includes('meat') || lower.includes('fish') || lower.includes('egg')) return '🍗';
            return '🛍️';
          };

          return (
            <div key={cat._id}>
              <div className="h-14 sm:h-20 w-full" />
              <section className="px-2.5 sm:px-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-text tracking-tight flex items-center gap-2">
                    <span>{getCategoryEmoji(cat.name)}</span> {cat.name}
                  </h2>
                  <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">Fresh items and daily essentials</p>
                </div>
                <Link
                  to={`/category/${cat._id}`}
                  className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100/80 text-primary text-xs font-bold rounded-full transition-all border border-orange-100/30 flex items-center gap-1.5 active:scale-95"
                >
                  See All <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {products.slice(0, 5).map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
              </div>
            </section>
          </div>
          );
        })
      )}

      <div className="h-14 sm:h-20 w-full" />
      {/* Popular Stores */}
      <section className="px-2.5 sm:px-4">
        <div className="mb-5">
          <h2 className="text-lg font-black text-text tracking-tight">🏪 Popular Stores Near You</h2>
          <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">Top-rated local grocery hubs</p>
        </div>
        <div className="flex lg:grid gap-4 overflow-x-auto lg:overflow-x-visible scrollbar-hide lg:grid-cols-5 pb-3 lg:pb-0">
          {activeStores.map((shop, i) => (
            <motion.div
              key={shop._id || i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6, scale: 1.01 }}
              onClick={() => handleStoreClick(shop)}
              className="min-w-[200px] sm:min-w-[230px] lg:min-w-0 lg:w-full bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 relative cursor-pointer"
            >
              {/* Floating Verified Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/85 backdrop-blur-md text-primary text-[9px] font-black rounded-xl shadow-sm border border-white/50 z-10 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> Verified
              </div>

              <div className="h-32 overflow-hidden bg-bg-secondary relative">
                <img
                  src={shop.image}
                  alt={shop.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-text line-clamp-1">{shop.name}</h3>
                {shop.address && (
                  <p className="text-[10px] text-text-tertiary font-medium mt-0.5 line-clamp-1">📍 {shop.address}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-extrabold text-[#E59400] bg-orange-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                    ⭐ {shop.rating}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trending Products */}
      {!loading && (
        <>
          <div className="h-14 sm:h-20 w-full" />
          <section className="px-2.5 sm:px-4">
          <div className="mb-5">
            <h2 className="text-lg font-black text-text tracking-tight">📈 Trending Products</h2>
            <p className="text-[10px] text-text-tertiary font-semibold mt-0.5">Top picks by local shoppers</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {(allProducts.length > 0 ? allProducts : DEMO_PRODUCTS).slice(0, 10).map((p, i) => (
              <div key={p._id || i} className="w-full flex flex-col">
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        </section>
      </>
      )}

      <div className="h-20 sm:h-28 w-full" />
      {/* Offers & Coupons Banner - High-fidelity design */}
      <section className="px-2.5 sm:px-4 mb-36 sm:mb-52">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-[#FF7A00] via-[#FF9A1F] to-[#FFC400] relative overflow-hidden rounded-2xl sm:rounded-[22px] px-4 py-8 sm:p-12 text-white shadow-2xl shadow-orange-500/10 border border-white/10"
        >
          {/* Background shapes */}
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -left-10 -bottom-10 w-52 h-52 rounded-full bg-orange-600/20 blur-2xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur-md text-[10px] font-black rounded-full uppercase tracking-widest border border-white/20 mb-2.5 sm:mb-3.5">
                🎁 Welcome Gift
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight sm:leading-none">
                Get ₹100 Off Your Order!
              </h2>
              <p className="text-white/90 text-xs sm:text-sm mt-2 sm:mt-3.5 max-w-md font-medium">
                Save big on your very first order at Shifa Store. Fresh groceries and household essentials delivered in minutes.
              </p>
              
              <div className="relative inline-flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6 px-4 sm:px-5 py-2 sm:py-2.5 bg-black/10 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
                {/* Perforated ticket punch notches */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white"></div>
                
                <span className="text-[10px] sm:text-xs font-black text-white/95 uppercase tracking-wide pl-1.5">
                  🏷️ Use Code:
                </span>
                <span className="text-[11px] sm:text-sm font-black bg-white text-primary px-3 sm:px-3.5 py-1 rounded-lg shadow-md tracking-widest uppercase">
                  SHIFA100
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/search')}
              className="px-6 py-3.5 sm:px-8 sm:py-4 bg-gray-950 text-white hover:bg-gray-900 font-black text-xs sm:text-base rounded-xl shadow-2xl hover:shadow-black/25 transition-all flex items-center gap-2.5 w-fit shrink-0 cursor-pointer self-start md:self-center border border-white/10 group"
            >
              Order Now <FiArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF9A1F] group-hover:translate-x-1 transition-transform duration-300" />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Store Catalog Dialog Overlay */}
      {activeStore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white w-full h-full sm:h-[85vh] sm:max-w-4xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Store Header Banner */}
            <div className="relative h-44 sm:h-52 bg-bg-secondary shrink-0">
              <img src={activeStore.image} alt={activeStore.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-5 text-white">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-extrabold rounded-lg uppercase">Store Catalog</span>
                  <span className="text-[10px] text-white/80 font-medium">• Verified Partner</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-1.5">{activeStore.name}</h2>
                {activeStore.address && (
                  <p className="text-xs text-white/90 mt-1 flex items-center gap-1">📍 {activeStore.address}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-black text-[#E59400] bg-orange-50/10 px-2 py-0.5 rounded-lg">⭐ {activeStore.rating}</span>
                </div>
              </div>
              
              <button 
                onClick={() => setActiveStore(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 text-text flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border border-border/20 z-10"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Products Shelf */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-secondary">
              {loadingStoreProducts ? (
                <Spinner className="py-20" />
              ) : storeProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-border/30 p-6">
                  <span className="text-5xl">🏪</span>
                  <h3 className="text-sm font-black text-text mt-4">No Products Available</h3>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">This store hasn't listed any active products yet. Check back soon for exciting additions!</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-text uppercase tracking-wider">Available Products ({storeProducts.length})</h3>
                    <span className="text-xs text-text-tertiary">Select items to purchase</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {storeProducts.map((p, i) => (
                      <div key={p._id} className="w-full flex flex-col">
                        <ProductCard product={p} index={i} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Home;
