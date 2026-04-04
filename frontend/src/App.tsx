import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import MapComponent from './components/MapComponent';
import Feed from './pages/Feed';
import About from './pages/About';
import GodModeMap from './components/GodModeMap';

const Navigation = () => {
  const location = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const items = [
    { label: 'MAP', path: '/map' },
    { label: 'FEED', path: '/' },
    { label: 'ABOUT', path: '/about' }
  ];

  return (
    <header className="fixed top-0 w-full flex justify-center py-4 md:py-8 z-[2000]">
      <nav className="bg-surface p-1 flex relative border border-outline/20 mx-4 md:mx-0">
        <LayoutGroup>
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const isHovered = hovered === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => setHovered(item.path)}
                onMouseLeave={() => setHovered(null)}
                className={`relative px-4 md:px-8 py-2 md:py-3 w-[80px] md:w-[120px] text-center text-[11px] md:text-[13px] font-black tracking-widest transition-colors duration-300 z-10 ${isActive ? 'text-white' : 'text-espresso/40 hover:text-espresso/80'
                  }`}
              >
                {/* Active Selection Slider */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-x-1 inset-y-1 bg-espresso z-[-1]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}

                {/* Hover Ghost Slider */}
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      layoutId="hover-pill"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-x-1 inset-y-1 bg-espresso/5 z-[-2]"
                      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                    />
                  )}
                </AnimatePresence>

                {item.label}
              </NavLink>
            );
          })}
        </LayoutGroup>
      </nav>
    </header>
  );
};

const IncidentReporter = () => (
  <div className="fixed bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-[600px] flex flex-col gap-2 px-4 md:px-5 z-[3000]">
    <div className="bg-white p-1 md:p-2 flex items-center gap-2 border border-outline">
      <input
        type="text"
        placeholder="Describe the incident..."
        className="flex-1 bg-surface p-3 md:p-4 text-[14px] md:text-[15px] outline-none"
      />
      <button className="w-[44px] h-[44px] md:w-[50px] md:h-[50px] bg-surface flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="md:w-[20px] md:h-[20px]">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </button>
    </div>
    <button className="bg-terracotta text-white py-4 md:py-5 font-black text-[12px] md:text-[14px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="md:w-[18px] md:h-[18px]">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" />
      </svg>
      REPORT INCIDENT
    </button>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const isMapRoute = location.pathname === '/map';

  return (
    <div className="w-screen h-screen">
      <Navigation />
      <main className="relative w-full h-full pt-[80px] md:pt-[100px] z-50">
        <div className={`fixed inset-0 z-10 transition-opacity duration-300 ${isMapRoute ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <MapComponent />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[800px] mx-auto px-4 md:px-10 h-full overflow-y-auto"
          >
            <Routes location={location}>
              <Route path="/map" element={null} />
              <Route path="/" element={<Feed />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <IncidentReporter />
    </div>
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/godmode" element={<GodModeMap />} />
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
}