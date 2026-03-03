import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface NurseRouteProps {
  children: React.ReactNode;
}

export function NurseRoute({ children }: NurseRouteProps) {
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

  // Students should not access nurse routes
  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }

  // Staff should not access nurse routes
  if (profile.role === 'staff') {
    return <Navigate to="/staff/booking" replace />;
  }

  // Only nurses, supervisors, doctors, and admins can access these routes
  if (!['nurse', 'supervisor', 'doctor', 'admin'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
