import { Link, Navigate } from 'react-router-dom';
import { Calendar, Clock, Users, Shield } from 'lucide-react';
import { Header, Footer } from '~/components/layout';
import { Button } from '~/components/ui';
import { useAuthStore } from '~/modules/auth';

export function HomePage() {
  const { profile, isInitialized } = useAuthStore();

  // Show loading screen while auth is being initialized to prevent flash
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maroon-800">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect logged-in users away from the landing page
  if (profile) {
    if (profile.role === 'student') return <Navigate to="/student/booking" replace />;
    if (profile.role === 'staff') return <Navigate to="/staff/booking" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }


  const features = [
    {
      icon: Calendar,
      title: 'Easy Scheduling',
      description: 'Book your physical exam or consultation dates quickly without any hassle.',
    },
    {
      icon: Clock,
      title: 'Efficient Processing',
      description: 'Experience a streamlined workflow from appointment request to clinic approval.',
    },
    {
      icon: Users,
      title: 'For Students & Staff',
      description: 'A dedicated health scheduling system built for the Liceo de Cagayan University community.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health records and personal information are protected with enterprise-grade security.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <section className="bg-maroon-800 pb-20 pt-12 animate-fade-in relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-slide-up relative inline-block">
              University Clinic
              <span className="block text-gold-400 mt-2">Scheduling Made Simple</span>
            </h2>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-8 animate-slide-up animate-delay-100">
              Visit the Liceo de Cagayan University Clinic to schedule your physical examinations
              and consultations. Our clinic staff will assist you in booking your appointment
              quickly and efficiently.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animate-delay-200">
              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto transition-transform duration-200 hover:scale-105"
                >
                  Get Started
                  <Calendar className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <div className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white/90 font-medium tracking-wide">
                Beta Testing <span className="text-white/60 text-sm ml-2">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Why Use Our System?</h3>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Our clinic scheduling system is designed to make healthcare access easier for the
              entire Liceo community.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-scale-in flex flex-col items-center text-center"
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

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Meet the Developers</h3>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              The dedicated team from EdTech behind the Liceo de Cagayan University Clinic Scheduling System.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "Dr. Marco Marvin L. Rado", image: "/devs/dev-rado.png", initials: "MR", color: "from-maroon-600 to-maroon-800" },
              { name: "Harley Busa", image: "/devs/dev-busa.png", initials: "HB", color: "from-maroon-600 to-maroon-800" },
              { name: "Marsh Ivan H. Quintila", image: "/devs/dev-quintila.png", initials: "MQ", color: "from-maroon-600 to-maroon-800" },
              { name: "Cristan Jade Jumawan", image: "/devs/dev-jumawan.png", initials: "CJ", color: "from-maroon-600 to-maroon-800" },
            ].map((dev, index) => (
              <div
                key={index}
                className="group bg-gray-50 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:bg-white hover:shadow-xl border border-gray-100"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-20 h-20 sm:w-32 sm:h-32 mb-4 sm:mb-6 relative mx-auto">
                  <div className={`absolute inset-0 bg-gradient-to-br ${dev.color} rounded-full rotate-6 group-hover:rotate-12 transition-transform duration-300 opacity-20`}></div>
                  <div
                    className={`relative w-full h-full bg-gradient-to-br ${dev.color} rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg transform group-hover:scale-105 transition-transform duration-300 overflow-hidden`}
                    style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)', WebkitTransform: 'translateZ(0)' }}
                  >
                    {dev.image ? (
                      <img
                        src={dev.image}
                        alt={dev.name}
                        className="w-full h-full object-cover transform-gpu"
                      />
                    ) : (
                      <span className="drop-shadow-sm">{dev.initials}</span>
                    )}
                  </div>
                </div>
                <div className="w-full mt-2 flex items-center justify-center overflow-visible">
                  <h4 className="text-[clamp(12px,3.5vw,20px)] sm:text-[clamp(12px,2vw,18px)] lg:text-[clamp(11px,1.2vw,18px)] font-bold text-gray-900 mb-1 tracking-tight whitespace-nowrap">
                    {dev.name}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
