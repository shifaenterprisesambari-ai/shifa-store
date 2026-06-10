import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import store from './store/store';
import AppRoutes from './routes/AppRoutes';
import SplashScreen from './components/SplashScreen';
import socketService from './services/socketService';
import { fetchUser } from './store/authSlice';
import { setNotifications, addNotification } from './store/notificationSlice';
import { notificationService } from './services/notificationService';
import { subscribeUserToPush } from './services/pushNotification';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 30000 } },
});

const AppInit = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUser());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      // Connect socket and join user room
      socketService.connect();
      socketService.joinUserRoom(user._id);

      // Subscribe to Web Push Notifications
      subscribeUserToPush();

      // Listen for real-time notifications
      socketService.onNotification((notification) => {
        dispatch(addNotification(notification));
      });

      // Load existing notifications
      const loadNotifications = async () => {
        try {
          const { data } = await notificationService.getNotifications({ page: 1, limit: 20 });
          dispatch(setNotifications(data));
        } catch (e) { console.error('Failed to load notifications:', e); }
      };
      loadNotifications();

      return () => {
        socketService.offEvent('notification');
      };
    }
  }, [isAuthenticated, user?._id]);

  return children;
};

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {!splashDone ? (
            <SplashScreen onComplete={() => setSplashDone(true)} />
          ) : (
            <AppInit>
              <AppRoutes />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: { background: '#1A1A1A', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '500', padding: '12px 20px' },
                  success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
                  error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
                }}
              />
            </AppInit>
          )}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
