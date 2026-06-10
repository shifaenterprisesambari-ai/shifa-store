import api from './api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeUserToPush = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser');
      return;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return;
    }

    // Register our own sw.js from /public (works in dev + prod)
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('Service Worker registered ✅', registration.scope);
    } catch (swErr) {
      console.error('SW registration failed:', swErr);
      return;
    }

    // Wait until the SW is active
    await navigator.serviceWorker.ready;

    // Check if subscription already exists
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Fetch VAPID public key from backend
      const { data } = await api.get('/notifications/vapid-public-key');
      if (!data.publicKey) {
        console.error('No VAPID key returned from server');
        return;
      }
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // Send subscription to backend
    await api.post('/notifications/subscribe', subscription.toJSON());
    console.log('✅ Web Push Notifications activated');
  } catch (error) {
    console.error('Failed to subscribe to web push:', error);
  }
};
