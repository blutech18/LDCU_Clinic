import { Link } from 'react-router-dom';
import { Header, Footer } from '~/components/layout';
import { RegisterForm } from '~/modules/auth';

export function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl animate-scale-in">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-maroon-900 font-bold text-2xl">L</span>
              </div>
              <h1 className="text-2xl font-bold text-maroon-800">Create Account</h1>
              <p className="text-sm text-gray-600 mt-2">Register to start scheduling your clinic appointments</p>
            </div>
            <RegisterForm />
            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-maroon-800 font-medium hover:underline">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
