import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaCalendarAlt, FaUser, FaHistory, FaCog, FaSignOutAlt, FaUserNurse, FaClipboardList, FaUsers, FaEnvelope, FaCalendarCheck } from 'react-icons/fa';
import { useState } from 'react';
import { useAuthStore } from '~/modules/auth';
import { LogoutModal } from '~/components/modals/LogoutModal';

interface SidebarProps {
    isOpen: boolean;
    isMobile: boolean;
}

// Define menu items closer to valid icons for the app's context
const menuItems = [
    { path: '/supervisor/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/schedule', icon: FaCalendarAlt, label: 'Schedule' },
    { path: '/appointments', icon: FaHistory, label: 'Appointments' },
    { path: '/profile', icon: FaUser, label: 'Profile' },
];

// Supervisor-only menu items
const supervisorItems = [
    { path: '/supervisor/nurses', icon: FaUserNurse, label: 'Nurse Assignment' },
    { path: '/supervisor/audit-logs', icon: FaClipboardList, label: 'Audit Logs' },
];

const Sidebar = ({ isOpen, isMobile }: SidebarProps) => {
    const location = useLocation();
    const { profile, logout } = useAuthStore();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // Admin sub-items (only shown for admin role)
    const adminItems = profile?.role === 'admin'
        ? [
            { path: '/admin', icon: FaUsers, label: 'User Management', exact: true },
            { path: '/admin/booking-settings', icon: FaCog, label: 'Booking Settings', exact: false },
            { path: '/admin/email-templates', icon: FaEnvelope, label: 'Email Templates', exact: false },
            { path: '/admin/schedule-config', icon: FaCalendarCheck, label: 'Schedule Config', exact: false },
          ]
        : [];

    const isSupervisor = profile?.role === 'supervisor';

    let navigation = menuItems.filter(item => item.path !== '/profile');
    if (isSupervisor) {
        navigation = [...navigation, ...supervisorItems];
    }

    // Always ensure profile is at the bottom
    const profileItem = menuItems.find(item => item.path === '/profile');
    if (profileItem) {
        navigation.push(profileItem);
    }

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
            transition: { duration: 0.3, ease: 'easeInOut' as const }
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
                                        className={`flex items-center h-12 rounded-lg transition-colors duration-200 text-maroon-100 hover:bg-maroon-700 hover:text-white ${isActive ? 'text-gold-400 font-semibold' : ''}`}
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

                        {/* Admin-only section */}
                        {adminItems.length > 0 && (
                            <>
                                {/* Admin section label */}
                                <motion.li
                                    initial={false}
                                    animate={{ opacity: isOpen ? 1 : 0, height: isOpen ? 'auto' : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-maroon-300/70">
                                        Admin
                                    </p>
                                </motion.li>
                                {adminItems.map((item) => {
                                    const isActive = item.exact
                                        ? location.pathname === item.path
                                        : location.pathname.startsWith(item.path);
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.path}>
                                            <NavLink
                                                to={item.path}
                                                end={item.exact}
                                                className={`flex items-center h-12 rounded-lg transition-colors duration-200 text-maroon-100 hover:bg-maroon-700 hover:text-white ${isActive ? 'text-gold-400 font-semibold' : ''}`}
                                            >
                                                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                                    <Icon className={`w-5 h-5 ${isActive ? 'text-gold-400' : ''}`} />
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
                                                    {item.label}
                                                </motion.span>
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </>
                        )}
                    </ul>
                </nav>

                {/* Footer - Logout */}
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-maroon-800">
                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className="flex items-center h-12 w-full rounded-lg transition-colors duration-200 text-maroon-100 hover:bg-maroon-700 hover:text-white"
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
