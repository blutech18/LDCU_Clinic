import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const verifyRole = useAuthStore.getState().verifyRole;
  const [roleValid, setRoleValid] = useState(true);
  const verifiedRef = useRef(false);

  useEffect(() => {
    // Only verify once per mount (not on every re-render from token refreshes)
    if (!isInitialized || !isAuthenticated || verifiedRef.current) return;
    verifiedRef.current = true;
    let cancelled = false;
    verifyRole().then((valid) => {
      if (!cancelled) setRoleValid(valid);
    });
    return () => { cancelled = true; };
  }, [isInitialized, isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!roleValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
