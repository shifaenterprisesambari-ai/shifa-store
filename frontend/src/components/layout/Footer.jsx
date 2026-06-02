import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiInstagram, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const Footer = () => (
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
            <a href="#" className="w-9 h-9 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-colors"><FiFacebook className="w-4 h-4" /></a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-colors"><FiTwitter className="w-4 h-4" /></a>
            <a href="#" className="w-9 h-9 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-colors"><FiInstagram className="w-4 h-4" /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Quick Links</h3>
          <ul className="space-y-2.5 text-sm text-gray-400">
            <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
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
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-center gap-2"><FiMapPin className="w-4 h-4 text-primary shrink-0" /> Ambari, Guwahati</li>
            <li className="flex items-center gap-2"><FiPhone className="w-4 h-4 text-primary shrink-0" /> +91 9876543210</li>
            <li className="flex items-center gap-2"><FiMail className="w-4 h-4 text-primary shrink-0" /> support@shifastore.com</li>
          </ul>
        </div>
      </div>

      <hr className="border-gray-800 my-8" />
      <p className="text-center text-gray-500 text-xs">&copy; {new Date().getFullYear()} Shifa Store. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
