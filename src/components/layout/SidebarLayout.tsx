import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
} from 'lucide-react';
import { useAuthStore } from '~/modules/auth';
import Sidebar from './Sidebar';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

// Map paths to labels for header title
const pageLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/schedule': 'Schedule',
  '/appointments': 'Appointments',
  '/profile': 'Profile',
  '/admin': 'Admin',
};

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { profile } = useAuthStore();
  const location = useLocation();

  // Initialize from localStorage or based on screen size
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth >= 1024;
  });

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Only close sidebar when switching TO mobile
      if (mobile) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [location.pathname, isMobile]);

  const getPageTitle = (pathname: string) => {
    const found = Object.entries(pageLabels).find(([path]) => pathname.startsWith(path));
    return found ? found[1] : 'Liceo Clinic';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Heavy Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Header - Fixed Top */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          {/* Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 focus:outline-none"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <Menu className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-maroon-900 rounded-full flex items-center justify-center text-white font-bold text-sm">
              LC
            </div>
            <h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
              {getPageTitle(location.pathname)}
            </h2>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{profile?.first_name} {profile?.last_name}</p>
          </div>
          <div className="w-8 h-8 bg-maroon-100 rounded-full flex items-center justify-center border border-maroon-200">
            <span className="text-maroon-800 font-bold text-xs">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </span>
          </div>
        </div>
      </header>

      {/* New Sidebar Component */}
      <Sidebar isOpen={isOpen} />

      {/* Main Content Area */}
      <main
        className="flex-1 pt-14 transition-[margin-left] duration-300 ease-in-out"
        style={{
          marginLeft: isMobile ? 0 : (isOpen ? 260 : 72)
        }}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
