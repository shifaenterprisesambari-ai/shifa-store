import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { productService } from '../../services/productService';
import ProductCard from '../../components/ProductCard';
import { SkeletonList, EmptyState } from '../../components/ui/Loaders';
import { DEMO_PRODUCTS } from '../../constants';

/* Client-side search — no backend search API exists */
const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: cats } = await productService.getCategories();
        const all = [];
        await Promise.all(cats.map(async (cat) => {
          try { const { data } = await productService.getProductsByCategory(cat._id); all.push(...data.map((p) => ({ ...p, categoryName: cat.name }))); } catch {}
        }));
        setAllProducts(all.length > 0 ? all : DEMO_PRODUCTS.map((p, i) => ({ ...p, _id: `demo-${i}` })));
      } catch { setAllProducts(DEMO_PRODUCTS.map((p, i) => ({ ...p, _id: `demo-${i}` }))); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = query.trim() ? allProducts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || (p.categoryName || p.category || '').toLowerCase().includes(query.toLowerCase())) : allProducts;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6">
      <div className="relative max-w-xl mx-auto mb-8">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-5 h-5" />
        <input type="text" placeholder="Search for products, categories..." value={query}
          onChange={(e) => { setQuery(e.target.value); setSearchParams(e.target.value ? { q: e.target.value } : {}); }}
          autoFocus className="w-full pl-12 pr-4 py-3.5 bg-bg-secondary rounded-2xl text-sm border-2 border-transparent focus:border-primary/30 focus:bg-white focus:outline-none transition-all" />
      </div>

      <p className="text-sm text-text-secondary mb-4">{filtered.length} results {query && `for "${query}"`}</p>

      {loading ? <SkeletonList count={8} /> : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No results found" description={`Try searching for something else`} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
};

export default Search;
