import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { toggleNotifications, markRead, markAllRead } from '../store/notificationSlice';
import { notificationService } from '../services/notificationService';

const NotificationPanel = () => {
  const dispatch = useDispatch();
  const { items, unreadCount, isOpen } = useSelector((s) => s.notifications);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      dispatch(markRead(id));
    } catch (e) { dispatch(markRead(id)); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      dispatch(markAllRead());
    } catch (e) { dispatch(markAllRead()); }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dispatch(toggleNotifications())} className="fixed inset-0 bg-black/30 z-50" />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <FiBell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-text">Notifications</h2>
                {unreadCount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">{unreadCount}</span>}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                    <FiCheckCircle className="w-3.5 h-3.5" /> Read all
                  </button>
                )}
                <button onClick={() => dispatch(toggleNotifications())} className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors">
                  <FiX className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <span className="text-5xl mb-3">🔔</span>
                  <p className="text-text-secondary text-sm">No notifications yet</p>
                </div>
              ) : (
                items.map((n) => (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                    className={`px-5 py-4 border-b border-border/30 cursor-pointer hover:bg-bg-secondary transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text">{n.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-text-tertiary mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;
