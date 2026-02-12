import { Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '~/modules/auth';
import { LogoutModal } from '~/components/modals/LogoutModal';
import { Footer } from './Footer';

interface StudentLayoutProps {
    children: React.ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
    const { profile, logout } = useAuthStore();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setIsLogoutModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-maroon-800 border-b border-maroon-700 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/student/booking" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                <img src="/ldcu-logo.png" alt="LDCU Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold text-white whitespace-nowrap">Medical and Dental Clinic</h1>
                            </div>
                        </Link>

                        {/* User Info & Actions */}
                        <div className="flex items-center gap-4">
                            {/* User Profile */}
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">
                                        {profile?.first_name} {profile?.last_name}
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-maroon-900" />
                                </div>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={() => setIsLogoutModalOpen(true)}
                                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-white hover:bg-maroon-700 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
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
