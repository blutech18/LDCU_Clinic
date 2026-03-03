import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface StudentRouteProps {
    children: React.ReactNode;
}

export function StudentRoute({ children }: StudentRouteProps) {
    const { profile, isInitialized, isAuthenticated, verifyRole } = useAuthStore();
    const [roleValid, setRoleValid] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const verify = async () => {
            if (!isInitialized || !isAuthenticated) return;
            const valid = await verifyRole(['student', 'staff']);
            if (!cancelled) setRoleValid(valid);
        };
        verify();
        return () => { cancelled = true; };
    }, [isInitialized, isAuthenticated, verifyRole]);

    if (!isAuthenticated || !profile) {
        return <Navigate to="/login" replace />;
    }

    if (!roleValid || (profile.role !== 'student' && profile.role !== 'staff')) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
