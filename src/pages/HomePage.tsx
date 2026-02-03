import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, Shield } from 'lucide-react';
import { Header, Footer } from '~/components/layout';
import { Button } from '~/components/ui';

export function HomePage() {
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
              <Link to="/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-maroon-800 transition-all duration-200"
                >
                  Register Now
                </Button>
              </Link>
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
