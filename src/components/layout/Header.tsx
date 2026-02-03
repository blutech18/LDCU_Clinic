import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, X, Calendar, User, History, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '~/modules/auth';
import { Button } from '~/components/ui';

export function Header() {
  const { profile, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Calendar },
    { name: 'Schedule', href: '/schedule', icon: Calendar },
    { name: 'My Appointments', href: '/appointments', icon: History },
    { name: 'Profile', href: '/profile', icon: User },
    ...(profile?.role === 'admin' ? [{ name: 'Admin', href: '/admin', icon: Settings }] : []),
  ];

  return (
    <header className="bg-maroon-800 text-white shadow-lg sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <span className="text-maroon-900 font-bold text-lg">L</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold">Liceo Clinic</h1>
              <p className="text-xs text-gold-300">Scheduling System</p>
            </div>
          </Link>

          {profile && (
            <>
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

              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 animate-fade-in">
                  <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-maroon-900" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-xs text-gold-300 capitalize">{profile.role}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
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
            <div className="flex items-center space-x-2 animate-fade-in">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-maroon-700">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {mobileMenuOpen && profile && (
          <div className="md:hidden py-4 border-t border-maroon-700 animate-slide-in">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => (
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
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
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
  );
}
