import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface StudentRouteProps {
    children: React.ReactNode;
}

export function StudentRoute({ children }: StudentRouteProps) {
    const { profile, isLoading, isInitialized, isAuthenticated, verifyRole } = useAuthStore();
    const [isVerifying, setIsVerifying] = useState(true);
    const [roleValid, setRoleValid] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const verify = async () => {
            if (!isInitialized || !isAuthenticated) {
                setIsVerifying(false);
                return;
            }
            const valid = await verifyRole(['student']);
            if (!cancelled) {
                setRoleValid(valid);
                setIsVerifying(false);
            }
        };
        verify();
        return () => { cancelled = true; };
    }, [isInitialized, isAuthenticated, verifyRole]);

    if (isLoading || !isInitialized || isVerifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!profile || !isAuthenticated || !roleValid) {
        return <Navigate to="/login" replace />;
    }

    // Only students can access student routes
    if (profile.role !== 'student') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
