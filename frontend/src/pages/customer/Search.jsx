import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { productService } from '../../services/productService';
import ProductCard from '../../components/ProductCard';
import { SkeletonList, EmptyState } from '../../components/ui/Loaders';

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
        await Promise.all(
          cats.map(async (cat) => {
            try {
              const { data } = await productService.getProductsByCategory(cat._id);
              all.push(...data.map((p) => ({ ...p, categoryName: cat.name })));
            } catch {}
          })
        );
        setAllProducts(all);
      } catch {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Smart Search Relevance Categorization
  const { primaryMatches, categoryMatches } = useMemo(() => {
    if (!query.trim()) {
      return { primaryMatches: allProducts, categoryMatches: [] };
    }

    const q = query.trim().toLowerCase();
    const startsWithName = [];
    const containsName = [];
    const inCategoryOnly = [];

    // Deduplicate products by _id
    const map = new Map();
    allProducts.forEach((p) => {
      if (p._id && !map.has(p._id)) {
        map.set(p._id, p);
      }
    });

    map.forEach((p) => {
      const name = (p.name || '').toLowerCase();
      const catName = (p.categoryName || p.category?.name || p.category || '').toLowerCase();

      if (name.startsWith(q)) {
        startsWithName.push(p);
      } else if (name.includes(q)) {
        containsName.push(p);
      } else if (catName.includes(q)) {
        inCategoryOnly.push(p);
      }
    });

    return {
      primaryMatches: [...startsWithName, ...containsName],
      categoryMatches: inCategoryOnly,
    };
  }, [query, allProducts]);

  const totalResults = primaryMatches.length + categoryMatches.length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Search Input Bar */}
      <div className="relative max-w-xl mx-auto mb-8">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for products (e.g. Rice, Milk, Huggies)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchParams(e.target.value ? { q: e.target.value } : {});
          }}
          autoFocus
          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:border-primary/40 focus:bg-white focus:outline-none transition-all shadow-xs"
        />
      </div>

      {loading ? (
        <SkeletonList count={10} />
      ) : totalResults === 0 ? (
        <EmptyState icon="🔍" title="No results found" description={`No products match "${query}". Try searching for something else.`} />
      ) : (
        <div className="space-y-10">
          {/* Primary Name Matches */}
          {primaryMatches.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Direct Product Matches ({primaryMatches.length})</span>
                {query && <span className="text-xs font-medium text-slate-400">Exact name matches for "{query}"</span>}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {primaryMatches.map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Secondary Category Matches (Shown below as non-direct matches) */}
          {categoryMatches.length > 0 && query.trim() && (
            <div className="pt-6 border-t border-slate-200/80">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-600">Other Products in Related Categories ({categoryMatches.length})</h3>
                <p className="text-xs text-slate-400 mt-0.5">These items matched category names instead of product titles</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 opacity-90">
                {categoryMatches.map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
