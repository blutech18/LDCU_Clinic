import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaCalendarAlt, FaUser, FaHistory, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useState } from 'react';
import { useAuthStore } from '~/modules/auth';
import { LogoutModal } from '~/components/modals/LogoutModal';

interface SidebarProps {
    isOpen: boolean;
    isMobile: boolean;
}

// Define menu items closer to valid icons for the app's context
const menuItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/schedule', icon: FaCalendarAlt, label: 'Schedule' },
    { path: '/appointments', icon: FaHistory, label: 'Appointments' },
    { path: '/profile', icon: FaUser, label: 'Profile' },
];

const Sidebar = ({ isOpen, isMobile }: SidebarProps) => {
    const location = useLocation();
    const { profile, logout } = useAuthStore();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const adminItem = profile?.role === 'admin' ? { path: '/admin', icon: FaCog, label: 'Admin' } : null;
    const navigation = adminItem ? [...menuItems, adminItem] : menuItems;

    const handleLogout = () => {
        logout();
        setIsLogoutModalOpen(false);
    };

    const sidebarVariants = {
        mobile: {
            x: isOpen ? 0 : -280,
            width: 260,
            transition: { type: 'spring' as const, damping: 25, stiffness: 200 }
        },
        desktop: {
            x: 0,
            width: isOpen ? 260 : 72,
            transition: { duration: 0.3 }
        }
    };

    return (
        <>
            <motion.aside
                initial={false}
                animate={isMobile ? "mobile" : "desktop"}
                variants={sidebarVariants}
                className={`fixed top-14 left-0 bottom-0 sidebar-maroon overflow-hidden shadow-lg ${isMobile ? 'z-50' : 'z-40'}`}
            >
                <nav className="pt-4 px-3">
                    <ul className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            const Icon = item.icon;

                            return (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        className={`flex items-center h-12 rounded-lg transition-colors duration-200 text-maroon-100 hover:bg-maroon-800 hover:text-white ${isActive ? 'text-gold-400 font-semibold' : ''}`}
                                    >
                                        {/* Fixed-width icon container - always 48px, centered */}
                                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-gold-400' : ''}`} />
                                        </div>
                                        {/* Text that animates */}
                                        <motion.span
                                            initial={false}
                                            animate={{
                                                opacity: isOpen ? 1 : 0,
                                                width: isOpen ? 'auto' : 0,
                                            }}
                                            transition={{ duration: 0.2, delay: isOpen ? 0.1 : 0 }}
                                            className="whitespace-nowrap overflow-hidden text-sm font-medium"
                                        >
                                            {item.label}
                                        </motion.span>
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer - Logout */}
                <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-maroon-800 bg-maroon-900">
                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className="flex items-center h-12 w-full rounded-lg transition-colors duration-200 text-maroon-100 hover:bg-maroon-800 hover:text-white"
                        title="Logout"
                    >
                        {/* Fixed-width icon container */}
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                            <FaSignOutAlt className="w-5 h-5" />
                        </div>
                        <motion.span
                            initial={false}
                            animate={{
                                opacity: isOpen ? 1 : 0,
                                width: isOpen ? 'auto' : 0,
                            }}
                            transition={{ duration: 0.2, delay: isOpen ? 0.1 : 0 }}
                            className="whitespace-nowrap overflow-hidden text-sm font-medium"
                        >
                            Logout
                        </motion.span>
                    </button>
                </div>
            </motion.aside>

            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
            />
        </>
    );
};

export default Sidebar;
