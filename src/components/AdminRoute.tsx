import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface AdminRouteProps {
    children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
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
            const valid = await verifyRole(['admin']);
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

    if (!roleValid || profile.role !== 'admin') {
        return <Navigate to="/employee/dashboard" replace />;
    }

    return <>{children}</>;
}
