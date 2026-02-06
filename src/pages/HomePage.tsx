import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Calendar, Clock, Users, Shield } from 'lucide-react';
import { Header, Footer } from '~/components/layout';
import { Button } from '~/components/ui';
import { useAuthStore } from '~/modules/auth';

export function HomePage() {
  const { loginWithGoogle } = useAuthStore();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Failed to login with Google:', err);
      setIsGoogleLoading(false);
    }
  };

  const features = [
    {
      icon: Calendar,
      title: 'Easy Scheduling',
      description: 'Book your physical exam or consultation appointments with just a few clicks.',
    },
    {
      icon: Clock,
      title: 'Flexible Time Slots',
      description: 'Choose from available time slots that fit your schedule.',
    },
    {
      icon: Users,
      title: 'For Students & Employees',
      description: 'Dedicated scheduling system for the entire Liceo community.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health information is protected with enterprise-grade security.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <section className="bg-maroon-800 pb-20 pt-12 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-slide-up">
              University Clinic
              <span className="block text-gold-400 mt-2">Scheduling Made Simple</span>
            </h2>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-8 animate-slide-up animate-delay-100">
              Visit the Liceo de Cagayan University Clinic to schedule your physical examinations
              and consultations. Our clinic staff will assist you in booking your appointment
              quickly and efficiently.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animate-delay-200">
              <Link to="/login">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto transition-transform duration-200 hover:scale-105"
                >
                  Get Started
                  <Calendar className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-800 font-semibold rounded-lg border-2 border-gold-400 hover:bg-gray-50 transition-all duration-200 hover:scale-105 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isGoogleLoading ? 'Signing in...' : 'Login with Google'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Use Our System?</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our clinic scheduling system is designed to make healthcare access easier for the
              Liceo community.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-maroon-100 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110">
                  <feature.icon className="w-6 h-6 text-maroon-800" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
