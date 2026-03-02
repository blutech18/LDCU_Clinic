import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface EmployeeRouteProps {
  children: React.ReactNode;
}

export function EmployeeRoute({ children }: EmployeeRouteProps) {
  const { profile, isAuthenticated, isInitialized, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700"></div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Students should not access employee routes
  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }

  // Staff should not access employee routes
  if (profile.role === 'staff') {
    return <Navigate to="/staff/booking" replace />;
  }

  return <>{children}</>;
}
