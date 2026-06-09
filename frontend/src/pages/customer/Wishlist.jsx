import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectWishlistItems } from '../../store/wishlistSlice';
import ProductCard from '../../components/ProductCard';
import { EmptyState } from '../../components/ui/Loaders';

/* [MOCK] — Wishlist uses localStorage, no backend API */
const Wishlist = () => {
  const items = useSelector(selectWishlistItems);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-6">
      <h1 className="text-xl font-bold text-text mb-6">My Wishlist ({items.length})</h1>
      {items.length === 0 ? (
        <EmptyState icon="❤️" title="Your wishlist is empty" description="Save products you love for later"
          action={<Link to="/" className="px-6 py-2.5 gradient-primary text-white rounded-xl font-medium">Browse Products</Link>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {items.map((p, i) => <ProductCard key={p._id || p.id || i} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
