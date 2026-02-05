import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { ViewSchedulesPage } from './pages/ViewSchedulesPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { StudentBookingPage } from './pages/StudentBookingPage';
import { PublicCalendarPage } from './pages/PublicCalendarPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { StudentRoute } from './components/StudentRoute';

// Component that redirects users based on their role
function RoleBasedRedirect() {
  const { profile, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Students go to their booking page
  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }

  // Everyone else goes to the employee dashboard
  return <Navigate to="/employee/dashboard" replace />;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/calendar" element={<PublicCalendarPage />} />
      <Route path="/view-schedules" element={<ViewSchedulesPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Role-based redirect for /dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path="/student/booking"
        element={
          <StudentRoute>
            <StudentBookingPage />
          </StudentRoute>
        }
      />

      {/* Employee/Staff Routes (with Sidebar) */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <SchedulePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
    </Routes>
  );
}

export default App;
