import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, verifyRole } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const [roleValid, setRoleValid] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!isInitialized || !isAuthenticated) {
        setIsVerifying(false);
        return;
      }
      // Only verify the session is valid — do NOT restrict by role here.
      // Role-based restrictions are handled by AdminRoute, StudentRoute,
      // and RoleBasedRedirect. Passing no roles just refreshes the profile.
      const valid = await verifyRole();
      if (!cancelled) {
        setRoleValid(valid);
        setIsVerifying(false);
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [isInitialized, isAuthenticated, verifyRole]);

  if (!isInitialized || isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maroon-700"></div>
      </div>
    );
  }

  if (!isAuthenticated || !roleValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
