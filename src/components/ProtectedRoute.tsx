import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, verifyRole } = useAuthStore();
  const [roleValid, setRoleValid] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!isInitialized || !isAuthenticated) return;
      const valid = await verifyRole();
      if (!cancelled) setRoleValid(valid);
    };
    verify();
    return () => { cancelled = true; };
  }, [isInitialized, isAuthenticated, verifyRole]);

  if (!isAuthenticated || !roleValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
