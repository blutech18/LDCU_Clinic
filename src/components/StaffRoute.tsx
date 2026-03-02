import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface StaffRouteProps {
    children: React.ReactNode;
}

export function StaffRoute({ children }: StaffRouteProps) {
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
            const valid = await verifyRole(['staff']);
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

    if (!isAuthenticated || !profile) {
        return <Navigate to="/login" replace />;
    }

    // If role verification failed or user is not staff, redirect to dashboard
    if (!roleValid || profile.role !== 'staff') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
