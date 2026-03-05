import { Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';

interface HRRouteProps {
    children: React.ReactNode;
}

export function HRRoute({ children }: HRRouteProps) {
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

    if (profile.role !== 'hr') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
