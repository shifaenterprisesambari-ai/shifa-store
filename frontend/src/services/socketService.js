import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (this.socket?.connected) return this.socket;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🟢 Socket connected:', this.socket.id);
    });
    this.socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected');
    });
    this.socket.on('connect_error', (err) => {
      console.log('⚠️ Socket error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId) {
    if (this.socket) this.socket.emit('joinRoom', roomId);
  }

  joinUserRoom(userId) {
    if (this.socket) this.socket.emit('joinUserRoom', userId);
  }

  sendLocationUpdate(data) {
    if (this.socket) this.socket.emit('location-update', data);
  }

  onNotification(callback) {
    if (this.socket) this.socket.on('notification', callback);
  }

  onLocationUpdate(callback) {
    if (this.socket) this.socket.on('location-updated', callback);
  }

  onOrderUpdate(event, callback) {
    if (this.socket) this.socket.on(event, callback);
  }

  offEvent(event) {
    if (this.socket) this.socket.off(event);
  }

  getSocket() {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;
