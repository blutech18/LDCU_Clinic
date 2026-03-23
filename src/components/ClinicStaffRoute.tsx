import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface ClinicStaffRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for clinic-facing pages (appointments, schedule, reschedule, profile).
 * Allows: supervisor, nurse, doctor, admin
 * Blocks: student, staff, hr, pending
 */
export function ClinicStaffRoute({ children }: ClinicStaffRouteProps) {
  const { profile, isAuthenticated, isInitialized, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }

  if (profile.role === 'staff') {
    return <Navigate to="/staff/booking" replace />;
  }

  if (!['supervisor', 'nurse', 'doctor', 'admin'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
