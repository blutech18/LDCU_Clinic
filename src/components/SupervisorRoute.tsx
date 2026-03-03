import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface SupervisorRouteProps {
  children: React.ReactNode;
}

export function SupervisorRoute({ children }: SupervisorRouteProps) {
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

  // Students should not access supervisor routes
  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }

  // Staff should not access supervisor routes
  if (profile.role === 'staff') {
    return <Navigate to="/staff/booking" replace />;
  }

  // Only supervisors, nurses, doctors, and admins can access these routes
  if (!['supervisor', 'nurse', 'doctor', 'admin'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
