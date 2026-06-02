import { motion, AnimatePresence } from 'framer-motion';

export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-3 shadow-sm">
    <div className="skeleton w-full h-36 rounded-xl mb-3" />
    <div className="skeleton w-3/4 h-4 mb-2" />
    <div className="skeleton w-1/2 h-3 mb-2" />
    <div className="flex justify-between items-center mt-2">
      <div className="skeleton w-16 h-5" />
      <div className="skeleton w-20 h-8 rounded-lg" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 6 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

export const SkeletonCategoryRow = () => (
  <div className="flex gap-4 overflow-hidden py-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
        <div className="skeleton w-16 h-16 rounded-full" />
        <div className="skeleton w-14 h-3" />
      </div>
    ))}
  </div>
);

export const SkeletonBanner = () => (
  <div className="skeleton w-full h-40 sm:h-52 rounded-2xl" />
);

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-3 border-gray-200 border-t-primary rounded-full animate-spin`} />
    </div>
  );
};

export const EmptyState = ({ icon = '📭', title, description, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-6 text-center"
  >
    <span className="text-6xl mb-4">{icon}</span>
    <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
    <p className="text-text-secondary text-sm max-w-xs mb-6">{description}</p>
    {action}
  </motion.div>
);

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-16 px-6 text-center"
  >
    <span className="text-6xl mb-4">😵</span>
    <h3 className="text-lg font-semibold text-text mb-2">Oops!</h3>
    <p className="text-text-secondary text-sm max-w-xs mb-6">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors">
        Try Again
      </button>
    )}
  </motion.div>
);

export const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);
