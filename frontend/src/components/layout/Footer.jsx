import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiFacebook, FiInstagram, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  const { user, isAuthenticated } = useSelector((s) => s.auth);

  const getHomeLink = () => {
    if (!isAuthenticated || !user) return "/";
    if (user.role === 'ShopOwner') return "/shop/dashboard";
    if (user.role === 'DeliveryPartner') return "/delivery/dashboard";
    if (user.role === 'Admin') return "/admin/dashboard";
    return "/";
  };

  return (
    <footer className="bg-gray-900 text-white mt-12 hidden md:block">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Shifa Store" className="w-10 h-10 rounded-xl" />
              <span className="text-xl font-bold">Shifa Store</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted grocery partner. Fresh groceries, essentials and more delivered to your doorstep in minutes.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="https://www.facebook.com/share/14hoQBzP6ju/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-all text-white hover:scale-105" title="Follow us on Facebook"><FiFacebook className="w-4 h-4" /></a>
              <a href="https://wa.me/919365002276" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-600 flex items-center justify-center transition-all text-white hover:scale-105" title="Chat on WhatsApp"><FaWhatsapp className="w-4.5 h-4.5" /></a>
              <a href="https://www.instagram.com/shifastore.online/" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-white/10 hover:bg-pink-600 flex items-center justify-center transition-all text-white hover:scale-105" title="Follow us on Instagram"><FiInstagram className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link to={getHomeLink()} className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/search" className="hover:text-primary transition-colors">Browse Products</Link></li>
              <li><Link to="/orders" className="hover:text-primary transition-colors">My Orders</Link></li>
              <li><Link to="/cart" className="hover:text-primary transition-colors">Cart</Link></li>
            </ul>
          </div>

        {/* Categories */}
        <div>
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Categories</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            <li><span className="hover:text-primary cursor-pointer transition-colors">Milk, Curd & Paneer</span></li>
            <li><span className="hover:text-primary cursor-pointer transition-colors">Vegetables & Fruits</span></li>
            <li><span className="hover:text-primary cursor-pointer transition-colors">Ata, Rice & Dal</span></li>
            <li><span className="hover:text-primary cursor-pointer transition-colors">Munchies</span></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Contact Us</h3>
          <ul className="space-y-3.5 text-sm text-gray-400">
            <li className="flex items-start gap-2.5">
              <FiMapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-300 block uppercase tracking-wider">Our Office Address</span>
                <span>Ambari Baguan, Goalpara, Assam – 783129, India</span>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <FiPhone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-300 block uppercase tracking-wider">Phone & WhatsApp <span className="text-[10px] text-emerald-400 font-normal lowercase">(Available 24/7)</span></span>
                <a href="tel:+919365002276" className="hover:text-primary transition-colors">+91 93650 02276</a>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <FiMail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-300 block uppercase tracking-wider">Email Us</span>
                <a href="mailto:shifastore.onlinecustomer@gmail.com" className="hover:text-primary transition-colors">shifastore.onlinecustomer@gmail.com</a>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <hr className="border-gray-800 my-8" />
      <p className="text-center text-gray-500 text-xs">&copy; {new Date().getFullYear()} Shifa Store. All rights reserved.</p>
    </div>
  </footer>
  );
};

export default Footer;
