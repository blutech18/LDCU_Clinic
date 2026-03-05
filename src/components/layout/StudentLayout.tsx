import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '~/modules/auth';
import { LogoutModal } from '~/components/modals/LogoutModal';
import { Footer } from './Footer';

interface StudentLayoutProps {
    readonly children: React.ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
    const { profile, avatarUrl, logout } = useAuthStore();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    const handleLogout = () => {
        logout();
        setIsLogoutModalOpen(false);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on route change
    useEffect(() => {
        setIsDropdownOpen(false);
    }, [location.pathname]);

    const profilePath = profile?.role === 'staff' ? '/staff/profile' : '/student/profile';
    const bookingPath = profile?.role === 'staff' ? '/staff/booking' : '/student/booking';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-maroon-800 border-b border-maroon-700 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to={bookingPath} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                <img src="/ldcu-logo.png" alt="LDCU Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold text-white whitespace-nowrap">Medical and Dental Clinic</h1>
                            </div>
                        </Link>

                        {/* User Info & Actions */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* User Profile Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded-lg hover:bg-maroon-700 transition-colors group"
                                >
                                    <div className="hidden sm:block text-right">
                                        <p className="text-sm font-medium text-white group-hover:text-gray-100 transition-colors">
                                            {profile?.first_name} {profile?.last_name}
                                        </p>
                                        <p className="text-xs text-maroon-200 capitalize">{profile?.role}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white/20">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt={`${profile?.first_name} ${profile?.last_name}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <User className="w-5 h-5 text-maroon-900" />
                                            )}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* User Info (mobile) */}
                                        <div className="sm:hidden px-4 py-2 border-b border-gray-100">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {profile?.first_name} {profile?.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                                        </div>

                                        {/* Profile Link */}
                                        <Link
                                            to={profilePath}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Settings className="w-4 h-4 text-gray-500" />
                                            Profile Settings
                                        </Link>

                                        <div className="border-t border-gray-100 my-1"></div>

                                        {/* Logout */}
                                        <button
                                            onClick={() => {
                                                setIsDropdownOpen(false);
                                                setIsLogoutModalOpen(true);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header >

            {/* Main Content */}
            < main className="flex-1" >
                {children}
            </main >

            {/* Footer */}
            <Footer />

            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
            />
        </div >
    );
}
