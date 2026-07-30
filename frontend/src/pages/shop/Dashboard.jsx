import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPackage, FiShoppingBag, FiDollarSign, FiTrendingUp, FiClock, FiCheck, 
  FiX, FiSettings, FiSave, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiUploadCloud 
} from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { shopService } from '../../services/shopService';
import { productService } from '../../services/productService';
import { Spinner } from '../../components/ui/Loaders';
import MapLocationPicker from '../../components/ui/MapLocationPicker';
import toast from 'react-hot-toast';

const ShopDashboard = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  // Navigation
  const [activeSection, setActiveSection] = useState('orders'); // 'orders' or 'products'

  // Products state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesSearch = !productSearch ? true : (
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.description?.toLowerCase().includes(productSearch.toLowerCase())
    );
    const matchesCategory = !selectedCategory ? true : (
      (p.category?._id || p.category) === selectedCategory
    );
    return matchesSearch && matchesCategory;
  });

  // Store Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopImage, setShopImage] = useState('');
  const [shopLat, setShopLat] = useState(null);
  const [shopLng, setShopLng] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // Image Upload helpers
  const [productImageMode, setProductImageMode] = useState('upload'); // 'upload' or 'url'
  const [productFileName, setProductFileName] = useState('');
  const [settingsImageMode, setSettingsImageMode] = useState('upload'); // 'upload' or 'url'
  const [settingsFileName, setSettingsFileName] = useState('');

  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => { load(); }, [tab]);

  useEffect(() => {
    if (activeSection === 'products') {
      loadProducts();
    }
  }, [activeSection]);

  const load = async () => {
    try {
      const [statsRes, ordersRes, catRes, historyRes] = await Promise.all([
        shopService.getDashboard(),
        shopService.getOrders({ status: tab }),
        productService.getCategories(),
        shopService.getOrders({ status: 'delivered' }),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setCategories(catRes.data);
      setHistoryOrders(historyRes.data);

      if (statsRes.data.branch) {
        setShopName(statsRes.data.branch.name || '');
        setShopAddress(statsRes.data.branch.address || '');
        setShopImage(statsRes.data.branch.image || '');
        setIsClosed(statsRes.data.branch.isClosed || false);
        if (statsRes.data.branch.location) {
          setShopLat(statsRes.data.branch.location.latitude);
          setShopLng(statsRes.data.branch.location.longitude);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        shopService.getProducts({}),
        productService.getCategories(),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // FileReader helpers
  const handleProductFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setValue('image', event.target.result);
      setProductFileName(file.name);
      toast.success('Product image loaded successfully! 📸');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSettingsFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setShopImage(event.target.result);
      setSettingsFileName(file.name);
      toast.success('Store photo loaded successfully! 📸');
    };
    reader.onerror = () => {
      toast.error('Failed to read store image file');
    };
    reader.readAsDataURL(file);
  };

  const handleAccept = async (orderId) => {
    try {
      await shopService.acceptOrder(orderId);
      toast.success('Order accepted! 🚀');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to accept order'); }
  };

  const handleReject = async (orderId) => {
    try {
      await shopService.rejectOrder(orderId, { reason: 'Items not available' });
      toast.success('Order rejected');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to reject order'); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await shopService.updateSettings({
        name: shopName,
        address: shopAddress,
        image: shopImage,
        latitude: shopLat,
        longitude: shopLng,
        isClosed: isClosed
      });
      toast.success('Store settings updated successfully! 🎉');
      setShowSettings(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update store settings');
    }
  };

  const toggleShopStatus = async () => {
    try {
      const nextClosedState = !isClosed;
      await shopService.updateSettings({
        isClosed: nextClosedState
      });
      setIsClosed(nextClosedState);
      toast.success(nextClosedState ? 'Store is now Closed (Offline) 🏪🔴' : 'Store is now Open (Online) 🏪🟢');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update store status');
    }
  };

  // Product Actions
  const openEditProduct = (p) => {
    setEditProduct(p);
    Object.keys(p).forEach((k) => setValue(k, p[k]));
    setValue('category', p.category?._id || p.category);
    // If current image is a data URL or valid, default image mode to URL unless requested
    setProductImageMode(p.image?.startsWith('data:') ? 'upload' : 'url');
    setProductFileName('');
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await shopService.deleteProduct(id);
      toast.success('Product deleted successfully! 🗑️');
      loadProducts();
      // Refresh stats
      const statsRes = await shopService.getDashboard();
      setStats(statsRes.data);
    } catch (e) {
      toast.error('Failed to delete product');
    }
  };

  const handleToggleProduct = async (id) => {
    try {
      await shopService.toggleProduct(id);
      loadProducts();
      // Refresh stats
      const statsRes = await shopService.getDashboard();
      setStats(statsRes.data);
    } catch (e) {
      toast.error('Failed to toggle product status');
    }
  };

  const onSubmitProduct = async (values) => {
    try {
      const payload = {
        ...values,
        price: Number(values.price),
        discountPrice: values.discountPrice ? Number(values.discountPrice) : undefined,
        stockQuantity: values.stockQuantity ? Number(values.stockQuantity) : 0,
      };

      if (editProduct) {
        await shopService.updateProduct(editProduct._id, payload);
        toast.success('Product updated successfully! 🎉');
      } else {
        await shopService.addProduct(payload);
        toast.success('Product added successfully! 🎉');
      }
      setShowProductModal(false);
      setEditProduct(null);
      reset();
      loadProducts();
      // Refresh stats
      const statsRes = await shopService.getDashboard();
      setStats(statsRes.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save product');
    }
  };

  if (loading) return <Spinner className="py-20" />;

  const statCards = [
    { 
      label: 'Total Orders', 
      value: stats?.orders?.total || 0, 
      icon: FiPackage, 
      color: 'bg-blue-500',
      action: () => { setActiveSection('orders'); setTab('pending'); }
    },
    { 
      label: 'Pending', 
      value: stats?.orders?.pending || 0, 
      icon: FiClock, 
      color: 'bg-yellow-500',
      action: () => { setActiveSection('orders'); setTab('pending'); }
    },
    { 
      label: 'Delivered', 
      value: stats?.orders?.delivered || 0, 
      icon: FiCheck, 
      color: 'bg-green-500',
      action: () => { setActiveSection('orders'); setTab('delivered'); }
    },
    { 
      label: 'Total Sales', 
      value: `₹${stats?.revenue || 0}`, 
      icon: FiDollarSign, 
      color: 'bg-purple-500',
      action: () => { setActiveSection('orders'); setTab('delivered'); }
    },
    { 
      label: 'Total Earnings', 
      value: `₹${stats?.earnings || 0}`, 
      icon: FiTrendingUp, 
      color: 'bg-emerald-500',
      action: () => { setActiveSection('orders'); setTab('delivered'); }
    },
    { 
      label: 'Products', 
      value: stats?.products?.total || 0, 
      icon: FiShoppingBag, 
      color: 'bg-primary',
      action: () => { setActiveSection('products'); }
    },
    { 
      label: 'Products Sold', 
      value: stats?.products?.totalSold || 0, 
      icon: FiCheck, 
      color: 'bg-indigo-500',
      action: () => { setActiveSection('products'); }
    },
    { 
      label: 'Active Products', 
      value: stats?.products?.active || 0, 
      icon: FiTrendingUp, 
      color: 'bg-cyan-500',
      action: () => { setActiveSection('products'); }
    },
  ];

  return (
    <div className="p-2 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="w-10 h-10 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-xl font-bold text-text">Shop Dashboard</h1>
            <p className="text-sm text-text-secondary">{stats?.branch?.name || 'Welcome back!'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-2 bg-indigo-50 border border-indigo-200/80 rounded-xl flex items-center gap-2 text-xs font-bold text-indigo-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Site Owner Profit Cut: <strong className="text-indigo-950 text-sm ml-0.5">{stats?.branch?.commissionPercentage ?? 10}%</strong></span>
          </div>

          <button
            onClick={toggleShopStatus}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer ${
              isClosed 
                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isClosed ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]'}`} />
            {isClosed ? 'Closed (Offline)' : 'Open (Online)'}
          </button>
          
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={() => {
              setSettingsImageMode(shopImage?.startsWith('data:') ? 'upload' : 'url');
              setSettingsFileName('');
              setShowSettings(true);
            }}
            className="px-4 py-2.5 bg-bg-secondary hover:bg-bg-tertiary text-text rounded-xl border border-border/30 flex items-center gap-2 text-xs font-bold shadow-sm transition-all animate-none"
          >
            <FiSettings className="w-4 h-4 text-text-secondary animate-none" /> Edit Store Settings
          </motion.button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {statCards.map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={s.action}
            className="bg-white rounded-2xl p-4 border border-border/30 shadow-sm cursor-pointer hover:border-primary/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3 shadow-sm`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-black text-text">{s.value}</p>
            </div>
            <p className="text-[10px] font-bold text-text-secondary mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex border-b border-border/30 mb-6">
        <button
          onClick={() => setActiveSection('orders')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSection === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          📦 Orders Management
        </button>
        <button
          onClick={() => setActiveSection('products')}
          className={`px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSection === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          🏪 Product Catalog List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Main View Toggle */}
          {activeSection === 'orders' ? (
            <>
              {/* Order Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                {['pending', 'accepted', 'delivered', 'rejected'].map((t) => (
                  <button key={t} onClick={() => { setTab(t); setLoading(true); }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap ${tab === t ? 'gradient-primary text-white' : 'bg-bg-secondary text-text-secondary'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Orders List */}
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary text-sm bg-white rounded-2xl border border-border/30 shadow-sm">
                    No {tab} orders
                  </div>
                ) : orders.map((order, i) => (
                  <motion.div key={order._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border border-border/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-bold text-text">{order.orderId}</span>
                        <p className="text-xs text-text-secondary">{order.customer?.name} • {order.items?.length} items</p>
                      </div>
                      <span className="text-sm font-bold text-primary">₹{order.totalPrice}</span>
                    </div>
                    <div className="flex gap-3 flex-wrap mb-2">
                      {order.items?.slice(0, 3).map((item, j) => (
                        <span key={j} className="text-xs bg-bg-secondary px-2 py-1 rounded-lg text-text-secondary font-medium">{item.item?.name} × {item.count}</span>
                      ))}
                    </div>
                    {tab === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAccept(order._id)}
                          className="flex-1 py-2 bg-success hover:bg-success-dark text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer">
                          <FiCheck className="w-4 h-4" /> Accept
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleReject(order._id)}
                          className="flex-1 py-2 bg-error hover:bg-error-dark text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer">
                          <FiX className="w-4 h-4" /> Reject
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            /* Products Section */
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-text">Store Catalog List ({filteredProducts.length} products)</h2>
                  <p className="text-xs text-text-secondary mt-0.5">Manage and organize store products visible to customers</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditProduct(null);
                    reset();
                    setProductImageMode('upload');
                    setProductFileName('');
                    setShowProductModal(true);
                  }}
                  className="px-4 py-2.5 gradient-primary text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:shadow-lg transition-all cursor-pointer"
                >
                  <FiPlus className="w-4 h-4" /> Add New Product
                </motion.button>
              </div>

              {/* Search & Filter Row */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex-1 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">🔍</span>
                  <input
                    type="text"
                    placeholder="Search product by name or description..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-border/20 rounded-xl text-xs font-medium focus:border-primary/30 focus:outline-none shadow-sm transition-all"
                  />
                  {productSearch && (
                    <button 
                      onClick={() => setProductSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="w-full sm:w-52">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-border/20 rounded-xl text-xs font-semibold text-text-secondary focus:border-primary/30 focus:outline-none shadow-sm transition-all"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingProducts ? (
                <Spinner className="py-20" />
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-border/30 p-8 shadow-sm max-w-lg mx-auto">
                  <span className="text-5xl">🛍️</span>
                  <h3 className="text-base font-extrabold text-text mt-4">Your store catalog is empty</h3>
                  <p className="text-xs text-text-secondary mt-1.5 max-w-sm mx-auto">List products under your store categories so customers can browse, select, and purchase them.</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setEditProduct(null);
                      reset();
                      setProductImageMode('upload');
                      setProductFileName('');
                      setShowProductModal(true);
                    }}
                    className="mt-6 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Add Your First Product
                  </motion.button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-border/30 p-8 shadow-sm">
                  <span className="text-3xl">🔍</span>
                  <h3 className="text-sm font-bold text-text mt-3">No matching products found</h3>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">Try adjusting your search query or switching categories.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((p, i) => (
                    <motion.div
                      key={p._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white rounded-2xl border border-border/30 p-4 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary/10 transition-all"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-bg-secondary p-1 border border-border/20 flex items-center justify-center">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.src = '/logo.png'; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-text line-clamp-1">{p.name}</h3>
                          <p className="text-xs text-text-secondary font-medium">{p.category?.name || 'Uncategorized'} • {p.quantity}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black text-primary">₹{p.price}</span>
                            {p.discountPrice && <span className="text-xs text-text-tertiary line-through font-medium">₹{p.discountPrice}</span>}
                          </div>
                          <p className="text-[10px] text-text-secondary mt-1 font-semibold flex items-center gap-1.5">
                            Stock: 
                            {p.stockQuantity === 0 ? (
                              <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100">Out of Stock 🔴</span>
                            ) : p.stockQuantity < 10 ? (
                              <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">Low Stock ({p.stockQuantity}) ⚠️</span>
                            ) : (
                              <span className="text-emerald-600 font-extrabold">{p.stockQuantity} units</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditProduct(p)}
                            className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary hover:text-text transition-colors cursor-pointer"
                            title="Edit product"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p._id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-error transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleToggleProduct(p._id)}
                          className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:opacity-85 transition-opacity"
                        >
                          {p.isEnabled ? (
                            <><FiToggleRight className="w-5 h-5 text-success" /> <span className="text-success font-bold">Active</span></>
                          ) : (
                            <><FiToggleLeft className="w-5 h-5 text-text-tertiary" /> <span className="text-text-tertiary">Disabled</span></>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Completed Deals History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-border/30 p-5 shadow-sm sticky top-20">
            <h3 className="text-sm font-bold text-text mb-4 uppercase tracking-wider flex items-center gap-2">
              📜 Completed Deals History ({historyOrders.length})
            </h3>
            {historyOrders.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-8">No completed deals in history yet.</p>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                {historyOrders.map((deal) => (
                  <div key={deal._id} className="p-3 bg-bg-secondary/40 rounded-xl border border-border/20 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono font-bold text-primary">{deal.orderId}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Delivered
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary">
                      Date: {new Date(deal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      Customer: {deal.customer?.name || '—'}
                    </p>
                    <div className="flex justify-between mt-2 pt-1.5 border-t border-border/10">
                      <span className="text-text-secondary">Deals value:</span>
                      <span className="font-bold text-text">₹{deal.totalPrice}</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-text-secondary">Vendor Payout:</span>
                      <span className="font-bold text-success">₹{deal.vendorPayout || Math.round(deal.totalPrice * 0.9)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-border/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-text">Edit Store Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-bg-secondary cursor-pointer"><FiX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-950">Site Owner Profit Percentage</p>
                <p className="text-[10px] text-indigo-700 font-medium">Decided by Master Admin for your store</p>
              </div>
              <span className="text-sm font-black text-indigo-900 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-xs">
                {stats?.branch?.commissionPercentage ?? 10}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-xl">
              <span className="text-xs font-semibold text-text-secondary">Open/Closed Status</span>
              <button
                type="button"
                onClick={() => setIsClosed(!isClosed)}
                className="flex items-center gap-1.5 focus:outline-none"
              >
                {isClosed ? (
                  <><FiToggleLeft className="w-6 h-6 text-text-tertiary" /> <span className="text-xs font-bold text-text-secondary">Closed</span></>
                ) : (
                  <><FiToggleRight className="w-6 h-6 text-success" /> <span className="text-xs font-bold text-success">Open</span></>
                )}
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Store Name</label>
              <input required type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} 
                className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none" />
            </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Store Address</label>
                <input required type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} 
                  className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Store Location Coordinates</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent text-text-secondary font-medium">
                    {shopLat && shopLng ? `📍 Pinned: ${shopLat.toFixed(6)}, ${shopLng.toFixed(6)}` : '❌ Location pin not set'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="px-4 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-xs hover:bg-primary/20 transition-all cursor-pointer"
                  >
                    Change Pin
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Store Logo / Photograph</label>
                
                {/* Mode Selector */}
                <div className="flex gap-2 p-1.5 bg-bg-secondary rounded-xl mb-3">
                  <button
                    type="button"
                    onClick={() => setSettingsImageMode('upload')}
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      settingsImageMode === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    📤 Local Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsImageMode('url')}
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      settingsImageMode === 'url' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    🔗 Web Image URL
                  </button>
                </div>

                {settingsImageMode === 'upload' ? (
                  <div className="relative border-2 border-dashed border-border/60 hover:border-primary/40 rounded-xl p-5 flex flex-col items-center justify-center bg-bg-secondary hover:bg-white transition-all group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSettingsFile}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <FiUploadCloud className="w-8 h-8 text-text-tertiary group-hover:text-primary transition-colors mb-2" />
                    <span className="text-xs font-bold text-text mb-0.5">
                      {settingsFileName ? 'Change photo file' : 'Select store photo'}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {settingsFileName ? settingsFileName : 'PNG, JPG, WEBP up to 2MB'}
                    </span>
                  </div>
                ) : (
                  <input 
                    type="url" 
                    placeholder="https://..." 
                    value={shopImage} 
                    onChange={(e) => setShopImage(e.target.value)} 
                    className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none" 
                  />
                )}
              </div>

              {shopImage && (
                <div className="rounded-xl overflow-hidden h-28 border border-border/30 relative">
                  <img src={shopImage} alt="Store Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}

              <motion.button whileTap={{ scale: 0.97 }} type="submit"
                className="w-full py-3.5 gradient-primary text-white font-bold text-sm rounded-xl mt-2 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all">
                <FiSave className="w-4 h-4" /> Save Settings
              </motion.button>
            </form>
          </motion.div>

          {showMapPicker && (
            <MapLocationPicker
              title="Pin Store Location"
              initialCoords={{
                latitude: shopLat,
                longitude: shopLng
              }}
              initialAddress={shopAddress}
              onClose={() => setShowMapPicker(false)}
              onSelect={(loc) => {
                setShopLat(loc.latitude);
                setShopLng(loc.longitude);
                setShopAddress(loc.address);
              }}
            />
          )}
        </div>
      )}

      {/* Product Add/Edit Modal */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-border/20 my-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-text">{editProduct ? 'Edit Product Details' : 'Add New Product'}</h2>
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setEditProduct(null);
                    reset();
                  }}
                  className="p-1.5 rounded-lg hover:bg-bg-secondary cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmitProduct)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Product Name</label>
                  <input
                    required
                    type="text"
                    {...register('name', { required: true })}
                    className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none"
                    placeholder="e.g. Amul Fresh Butter"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Product Image</label>
                  
                  {/* Mode Selector */}
                  <div className="flex gap-2 p-1.5 bg-bg-secondary rounded-xl mb-3">
                    <button
                      type="button"
                      onClick={() => setProductImageMode('upload')}
                      className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        productImageMode === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
                      }`}
                    >
                      📤 Local Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductImageMode('url')}
                      className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        productImageMode === 'url' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
                      }`}
                    >
                      🔗 Web Image URL
                    </button>
                  </div>

                  {productImageMode === 'upload' ? (
                    <div className="relative border-2 border-dashed border-border/60 hover:border-primary/40 rounded-xl p-5 flex flex-col items-center justify-center bg-bg-secondary hover:bg-white transition-all group cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductFile}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <FiUploadCloud className="w-8 h-8 text-text-tertiary group-hover:text-primary transition-colors mb-2" />
                      <span className="text-xs font-bold text-text mb-0.5">
                        {productFileName ? 'Change image file' : 'Select product photo'}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {productFileName ? productFileName : 'PNG, JPG, WEBP up to 2MB'}
                      </span>
                    </div>
                  ) : (
                    <input
                      required
                      type="url"
                      {...register('image', { required: true })}
                      className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none"
                      placeholder="https://images.unsplash.com/..."
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Description</label>
                  <textarea
                    rows={2}
                    {...register('description')}
                    className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none resize-none"
                    placeholder="Describe product specs, ingredients, or health values"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Price (₹)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      {...register('price', { required: true })}
                      className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none"
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Discount Price / MRP (₹)</label>
                    <input
                      type="number"
                      min="0"
                      {...register('discountPrice')}
                      className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none"
                      placeholder="90 (optional)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Quantity (e.g. 500 g, 1 L)</label>
                    <input
                      required
                      type="text"
                      {...register('quantity', { required: true })}
                      className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none"
                      placeholder="500 g"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      {...register('stockQuantity')}
                      className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none"
                      placeholder="50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Category</label>
                  <select
                    required
                    {...register('category', { required: true })}
                    className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:outline-none"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="w-full py-3.5 gradient-primary text-white font-bold text-sm rounded-xl mt-2 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <FiSave className="w-4 h-4" /> {editProduct ? 'Update Product' : 'Publish Product to Store'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopDashboard;
