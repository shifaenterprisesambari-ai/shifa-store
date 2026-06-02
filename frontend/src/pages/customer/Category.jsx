import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { productService } from '../../services/productService';
import ProductCard from '../../components/ProductCard';
import { SkeletonList } from '../../components/ui/Loaders';

const Category = () => {
  const { categoryId } = useParams();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          productService.getProductsByCategory(categoryId),
          productService.getCategories(),
        ]);
        setProducts(prodRes.data);
        setCategory(catRes.data.find((c) => c._id === categoryId));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [categoryId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 rounded-xl hover:bg-bg-secondary transition-colors"><FiArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-xl font-bold text-text">{category?.name || 'Category'}</h1>
          <p className="text-sm text-text-secondary">{products.length} products</p>
        </div>
      </div>
      {loading ? <SkeletonList count={8} /> : products.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">📦</span>
          <p className="text-text-secondary mt-4">No products in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
};

export default Category;
