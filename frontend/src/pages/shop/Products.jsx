import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiX, FiSave } from 'react-icons/fi';
import { shopService } from '../../services/shopService';
import { productService } from '../../services/productService';
import { useForm } from 'react-hook-form';
import { Spinner } from '../../components/ui/Loaders';
import toast from 'react-hot-toast';

const ShopProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([shopService.getProducts({}), productService.getCategories()]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const onSubmit = async (values) => {
    try {
      if (editProduct) {
        await shopService.updateProduct(editProduct._id, { ...values, price: Number(values.price), discountPrice: Number(values.discountPrice) || undefined, stockQuantity: Number(values.stockQuantity) || 0 });
        toast.success('Product updated');
      } else {
        await shopService.addProduct({ ...values, price: Number(values.price), discountPrice: Number(values.discountPrice) || undefined, stockQuantity: Number(values.stockQuantity) || 0 });
        toast.success('Product added');
      }
      setShowModal(false);
      setEditProduct(null);
      reset();
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await shopService.deleteProduct(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Failed'); }
  };

  const handleToggle = async (id) => {
    try { await shopService.toggleProduct(id); load(); }
    catch (e) { toast.error('Failed'); }
  };

  const openEdit = (p) => {
    setEditProduct(p);
    Object.keys(p).forEach((k) => setValue(k, p[k]));
    setValue('category', p.category?._id || p.category);
    setShowModal(true);
  };

  if (loading) return <Spinner className="py-20" />;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">My Products ({products.length})</h1>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditProduct(null); reset(); setShowModal(true); }}
          className="px-4 py-2.5 gradient-primary text-white text-sm font-semibold rounded-xl flex items-center gap-2 hover:shadow-lg transition-all">
          <FiPlus className="w-4 h-4" /> Add Product
        </motion.button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p, i) => (
          <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-white rounded-2xl border border-border/30 p-4 shadow-sm">
            <div className="flex gap-3">
              <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-contain bg-bg-secondary p-1" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-text line-clamp-1">{p.name}</h3>
                <p className="text-xs text-text-secondary">{p.category?.name} • {p.quantity}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-primary">₹{p.price}</span>
                  {p.discountPrice && <span className="text-xs text-text-tertiary line-through">₹{p.discountPrice}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"><FiEdit2 className="w-4 h-4 text-text-secondary" /></button>
                <button onClick={() => handleDelete(p._id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors"><FiTrash2 className="w-4 h-4 text-error" /></button>
              </div>
              <button onClick={() => handleToggle(p._id)} className="flex items-center gap-1.5 text-xs font-medium">
                {p.isEnabled ? <><FiToggleRight className="w-5 h-5 text-success" /> Active</> : <><FiToggleLeft className="w-5 h-5 text-text-tertiary" /> Disabled</>}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-text">{editProduct ? 'Edit Product' : 'Add Product'}</h2>
                <button onClick={() => { setShowModal(false); setEditProduct(null); reset(); }} className="p-1.5 rounded-lg hover:bg-bg-secondary"><FiX className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {[
                  { name: 'name', label: 'Product Name', type: 'text', required: true },
                  { name: 'image', label: 'Image URL', type: 'url', required: true },
                  { name: 'description', label: 'Description', type: 'text' },
                  { name: 'price', label: 'Price (₹)', type: 'number', required: true },
                  { name: 'discountPrice', label: 'MRP / Discount Price (₹)', type: 'number' },
                  { name: 'quantity', label: 'Quantity (e.g., 500 g)', type: 'text', required: true },
                  { name: 'stockQuantity', label: 'Stock Quantity', type: 'number' },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="text-xs font-medium text-text-secondary mb-1 block">{f.label}</label>
                    <input {...register(f.name, { required: f.required })} type={f.type} className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:bg-white focus:outline-none" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Category</label>
                  <select {...register('category', { required: true })} className="w-full px-3 py-2.5 bg-bg-secondary rounded-xl text-sm border border-transparent focus:border-primary/30 focus:outline-none">
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} type="submit"
                  className="w-full py-3 gradient-primary text-white font-semibold rounded-xl mt-2 flex items-center justify-center gap-2">
                  <FiSave className="w-4 h-4" /> {editProduct ? 'Update' : 'Add'} Product
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopProducts;
