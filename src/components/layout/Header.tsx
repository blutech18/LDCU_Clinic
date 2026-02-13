import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Calendar, User, History, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '~/modules/auth';
import { Button } from '~/components/ui';
import { LogoutModal } from '~/components/modals/LogoutModal';

export function Header() {
  const { profile, logout } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Hide navigation links on the landing page
  const showNavigation = location.pathname !== '/';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Calendar },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'My Appointments', href: '/appointments', icon: History },
    { name: 'Profile', href: '/profile', icon: User },
    ...(profile?.role === 'admin' ? [{ name: 'Admin', href: '/admin', icon: Settings }] : []),
  ];

  const handleLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-maroon-800 text-white shadow-lg sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img src="/ldcu-logo.png" alt="LDCU Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold whitespace-nowrap">Medical and Dental Clinic</h1>
              </div>
            </Link>

            {profile && (
              <>
                {showNavigation && (
                  <nav className="hidden md:flex items-center space-x-4">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          `flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-maroon-700 scale-105' : 'hover:bg-maroon-700 hover:scale-105'
                          }`
                        }
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    ))}
                  </nav>
                )}

                <div className="hidden md:flex items-center space-x-4">
                  <div className="flex items-center space-x-2 animate-fade-in">
                    <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-maroon-900" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">
                        {profile.first_name} {profile.last_name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="text-white hover:bg-maroon-700 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>

                <button
                  className="md:hidden p-2 rounded-lg hover:bg-maroon-700 transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            )}

            {!profile && (
              <div className="flex items-center animate-fade-in">
                {/* Empty - no login button needed */}
              </div>
            )}
          </div>

          {mobileMenuOpen && profile && (
            <div className="md:hidden py-4 border-t border-maroon-700 animate-slide-in">
              <nav className="flex flex-col space-y-2">
                {showNavigation && navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-maroon-700 transition-colors duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-maroon-700 text-left w-full transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
