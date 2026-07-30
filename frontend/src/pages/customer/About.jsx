import { motion } from 'framer-motion';
import { FiClock, FiShield, FiHeart, FiMapPin, FiMail, FiPhone, FiStar, FiShoppingBag, FiTruck } from 'react-icons/fi';

const About = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
          <FiTruck className="w-3.5 h-3.5" /> Now delivering super fast
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-text tracking-tight leading-tight">
          About <span className="text-primary">Shifa Store</span>
        </h1>
        <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Goalpara's leading instant grocery delivery service. We bring fresh fruits, vegetables, kitchen essentials, and daily household needs directly to your doorstep instantly.
        </p>
      </motion.div>

      {/* Stats Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-3 md:gap-6 mb-16"
      >
        {[
          { number: 'Fastest', label: 'Average Delivery', icon: FiClock, color: 'text-orange-500 bg-orange-50' },
          { number: '5K+', label: 'Happy Customers', icon: FiHeart, color: 'text-rose-500 bg-rose-50' },
          { number: '500+', label: 'Products Available', icon: FiShoppingBag, color: 'text-amber-500 bg-amber-50' }
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="flex flex-col items-center justify-center p-4 md:p-6 bg-white border border-border/30 rounded-2xl shadow-sm text-center"
          >
            <div className={`p-2.5 rounded-xl mb-3 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <span className="text-lg md:text-2xl font-black text-text mb-1">{stat.number}</span>
            <span className="text-[10px] md:text-xs text-text-secondary uppercase font-semibold tracking-wider">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Core Values Section */}
      <div className="mb-16">
        <h2 className="text-xl md:text-2xl font-bold text-text mb-8 text-center">Built for Speed, Designed for You</h2>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            {
              title: 'Super Fast Delivery',
              desc: 'From the moment you place your order, our delivery riders are on their way. We guarantee fast delivery — every single time.',
              icon: FiClock,
              color: 'border-orange-100 hover:border-orange-300'
            },
            {
              title: 'Fresh & High Quality',
              desc: 'We source the freshest fruits, vegetables, and high-quality grocery items from trusted local vendors to ensure the best for your family.',
              icon: FiStar,
              color: 'border-amber-100 hover:border-amber-300'
            },
            {
              title: 'Precision Location',
              desc: 'Easily select your delivery location using our pinpoint map picker. Our delivery partners will find your doorstep without calling you.',
              icon: FiMapPin,
              color: 'border-emerald-100 hover:border-emerald-300'
            },
            {
              title: '100% Reliable',
              desc: 'Real-time order tracking, comprehensive quality checks, and active customer support ensure your order arrives in pristine condition.',
              icon: FiShield,
              color: 'border-indigo-100 hover:border-indigo-300'
            }
          ].map((card, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className={`p-6 bg-white border ${card.color} rounded-2xl shadow-sm transition-all duration-300`}
            >
              <div className="p-3 bg-bg-secondary w-fit rounded-xl mb-4 text-primary">
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-text text-base mb-2">{card.title}</h3>
              <p className="text-text-secondary text-xs leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Story & Contact Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="p-6 md:p-8 bg-gradient-to-br from-cream to-orange-50/20 border border-orange-100 rounded-3xl flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg md:text-xl font-bold text-text mb-4">Our Vision</h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-4">
              At Shifa Enterprises, our mission is to redefine local commerce in Goalpara by integrating advanced inventory routing, local fulfillment networks, and high-quality logistics technology.
            </p>
            <p className="text-text-secondary text-sm leading-relaxed">
              We want to give you your time back. No more long grocery lines, traffic jams, or carrying heavy bags. Get anything you need in minutes.
            </p>
          </div>
          <div className="mt-6 pt-6 border-t border-orange-100/50 flex items-center gap-3">
            <span className="text-amber-500 font-bold text-lg">4.9★</span>
            <span className="text-text-secondary text-xs">Rated by 5,000+ customers for exceptional speed and freshness.</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="p-6 md:p-8 bg-white border border-border/30 rounded-3xl flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg md:text-xl font-bold text-text mb-4">Get In Touch</h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-6">
              Have questions, issues, or want to partner with us? Reach out to our customer care team, and we will get back to you immediately.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-bg-secondary text-primary rounded-xl">
                  <FiMail className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-text-secondary uppercase font-bold tracking-wider">Email Address</span>
                  <a href="mailto:shifastore.onlinecustomer@gmail.com" className="text-sm font-semibold text-text hover:text-primary transition-colors">
                    shifastore.onlinecustomer@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-bg-secondary text-primary rounded-xl">
                  <FiPhone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-text-secondary uppercase font-bold tracking-wider">WhatsApp Support</span>
                  <a href="https://wa.me/919365002276" target="_blank" rel="noreferrer" className="text-sm font-semibold text-text hover:text-primary transition-colors">
                    +91 93650 02276
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-xs text-text-tertiary">
            © {new Date().getFullYear()} Shifa Enterprises. Goalpara, Assam, India.
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
