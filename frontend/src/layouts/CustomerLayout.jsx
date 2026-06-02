import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import BottomNav from '../components/layout/BottomNav';
import Footer from '../components/layout/Footer';
import NotificationPanel from '../components/NotificationPanel';

const CustomerLayout = () => (
  <div className="min-h-screen bg-bg flex flex-col">
    <Navbar />
    <NotificationPanel />
    <main className="flex-1 pb-20 md:pb-0">
      <Outlet />
    </main>
    <Footer />
    <BottomNav />
  </div>
);

export default CustomerLayout;
