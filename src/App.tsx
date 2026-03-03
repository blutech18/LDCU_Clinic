import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ScheduleDayPage } from './pages/ScheduleDayPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { ViewSchedulesPage } from './pages/ViewSchedulesPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { StudentBookingPage } from './pages/StudentBookingPage';
import { PublicCalendarPage } from './pages/PublicCalendarPage';
import { ReschedulePage } from './pages/ReschedulePage';
import { NurseAssignmentPage } from './pages/NurseAssignmentPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { StudentRoute } from './components/StudentRoute';
import { StaffRoute } from './components/StaffRoute';
import { EmployeeLayout } from './components/layout';
import { SupervisorRoute } from './components/SupervisorRoute';

// Redirects users based on their role — only rendered after isInitialized is true
function RoleBasedRedirect() {
  const { profile } = useAuthStore();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }
  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }
  if (profile.role === 'staff') {
    return <Navigate to="/staff/booking" replace />;
  }
  // Everyone else goes to the supervisor dashboard
  return <Navigate to="/supervisor/dashboard" replace />;
}

function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Single global loading gate — renders ONE spinner for the whole app
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maroon-800">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

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

      {/* Staff Routes */}
      <Route
        path="/staff/booking"
        element={
          <StaffRoute>
            <StudentBookingPage />
          </StaffRoute>
        }
      />

      {/* Supervisor/Nurse Routes — single persistent SidebarLayout via EmployeeLayout */}
      <Route element={<EmployeeLayout />}>
        <Route path="/supervisor/dashboard" element={<SupervisorRoute><DashboardPage /></SupervisorRoute>} />
        <Route path="/employee/dashboard" element={<SupervisorRoute><DashboardPage /></SupervisorRoute>} /> {/* Legacy redirect */}
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/schedule/day/:date" element={<ScheduleDayPage />} />
        <Route path="/reschedule" element={<ReschedulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/supervisor/nurses" element={<SupervisorRoute><NurseAssignmentPage /></SupervisorRoute>} />
        <Route path="/supervisor/audit-logs" element={<SupervisorRoute><AuditLogsPage /></SupervisorRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
