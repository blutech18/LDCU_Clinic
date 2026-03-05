import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface StudentRouteProps {
    children: React.ReactNode;
}

export function StudentRoute({ children }: StudentRouteProps) {
    const { profile, isInitialized, isAuthenticated } = useAuthStore();
    const verifyRole = useAuthStore.getState().verifyRole;
    const [roleValid, setRoleValid] = useState(true);
    const verifiedRef = useRef(false);

    useEffect(() => {
        // Only verify once per mount (not on every re-render from token refreshes)
        if (!isInitialized || !isAuthenticated || verifiedRef.current) return;
        verifiedRef.current = true;
        let cancelled = false;
        verifyRole(['student', 'staff', 'pending']).then((valid) => {
            if (!cancelled) setRoleValid(valid);
        });
        return () => { cancelled = true; };
    }, [isInitialized, isAuthenticated]);

    if (!isAuthenticated || !profile) {
        return <Navigate to="/login" replace />;
    }

    if (!roleValid || (profile.role !== 'student' && profile.role !== 'staff' && profile.role !== 'pending')) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
