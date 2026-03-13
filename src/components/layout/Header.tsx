import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Calendar, User, History, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '~/modules/auth';
import { Button } from '~/components/ui';
import { LogoutModal } from '~/components/modals/LogoutModal';

export function Header() {
  const { profile, avatarUrl, logout, loginWithGoogle } = useAuthStore();
  const displayAvatar = avatarUrl || profile?.avatar_url || null;
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setIsGoogleLoading(false);
    }
  };

  // Hide navigation links on the landing page and login page
  const showNavigation = location.pathname !== '/' && location.pathname !== '/login';

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
            <Link to="/" className="flex items-center space-x-3 group min-w-0">
              <div className="w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0">
                <img src="/ldcu-logo.png" alt="LDCU Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-base sm:text-lg font-bold whitespace-nowrap truncate">Medical and Dental Clinic</h1>
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

                <div className="hidden md:flex items-center space-x-5">
                  <div className="flex items-center gap-3 animate-fade-in">
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {profile.first_name} {profile.last_name}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                      {displayAvatar ? (
                        <img
                          src={displayAvatar}
                          alt={`${profile.first_name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-maroon-900 font-bold text-sm">
                          {profile.first_name?.[0]}{profile.last_name?.[0]}
                        </span>
                      )}
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
              <div className="flex items-center">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  title="Sign in with Google"
                  className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 bg-white text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-60"
                >
                  <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="hidden sm:inline">{isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>
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
