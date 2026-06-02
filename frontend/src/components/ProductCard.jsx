import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { FiPlus, FiMinus, FiHeart } from 'react-icons/fi';
import { addToCart, incrementQty, decrementQty, selectCartItems } from '../store/cartSlice';
import { toggleWishlist, selectIsWishlisted } from '../store/wishlistSlice';

const ProductCard = ({ product, index = 0 }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const isWishlisted = useSelector(selectIsWishlisted(product._id || product.id));
  const cartItem = cartItems.find((i) => i._id === product._id);
  const discount = product.discountPrice && product.discountPrice > product.price
    ? Math.round(((product.discountPrice - product.price) / product.discountPrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full bg-white rounded-2xl shadow-sm hover:shadow-xl border border-border/30 transition-shadow overflow-hidden group relative flex flex-col"
    >
      {/* Wishlist */}
      <button
        onClick={() => dispatch(toggleWishlist(product))}
        className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer"
      >
        <FiHeart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
      </button>

      {/* Discount Badge */}
      {discount > 0 && (
        <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 bg-success text-white text-[10px] font-bold rounded-lg">
          {discount}% OFF
        </div>
      )}

      {/* Image */}
      <div className="relative overflow-hidden bg-bg-secondary p-2 sm:p-3 shrink-0">
        <motion.img
          src={product.image}
          alt={product.name}
          className="w-full h-24 sm:h-36 object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => { e.target.src = '/amul_moti.jpg'; }}
        />
      </div>

      {/* Content */}
      <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Delivery time */}
          <div className="flex items-center gap-1 mb-1 sm:mb-1.5">
            <span className="text-[9px] sm:text-[10px] font-medium text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded">
              ⚡ {product.deliveryTime || '15 min'}
            </span>
            {product.rating && (
              <span className="text-[9px] sm:text-[10px] font-medium text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded">
                ⭐ {product.rating}
              </span>
            )}
          </div>

          <h3 className="text-xs sm:text-sm font-semibold text-text line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] leading-tight">{product.name}</h3>

          <p className="text-[10px] sm:text-xs text-text-tertiary mt-0.5">{product.quantity}</p>
        </div>

        {/* Price + Cart */}
        <div className="flex items-center justify-between mt-2 sm:mt-2.5">
          <div>
            <span className="text-sm sm:text-base font-bold text-text">₹{product.price}</span>
            {product.discountPrice && product.discountPrice > product.price && (
              <span className="text-[9px] sm:text-xs text-text-tertiary line-through ml-1 sm:ml-1.5">₹{product.discountPrice}</span>
            )}
          </div>

          {cartItem ? (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-primary rounded-lg overflow-hidden">
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => dispatch(decrementQty(product._id))} className="px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-white hover:bg-primary-dark transition-colors cursor-pointer">
                <FiMinus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </motion.button>
              <motion.span key={cartItem.count} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-white text-xs sm:text-sm font-bold min-w-[16px] sm:min-w-[20px] text-center">
                {cartItem.count}
              </motion.span>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => dispatch(incrementQty(product._id))} className="px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-white hover:bg-primary-dark transition-colors cursor-pointer">
                <FiPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => dispatch(addToCart(product))}
              className="px-3 sm:px-4 py-1 sm:py-1.5 border-2 border-primary text-primary text-xs sm:text-sm font-bold rounded-lg hover:bg-primary hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              ADD
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
