import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ScheduleDayPage } from './pages/ScheduleDayPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminBookingSettingsPage } from './pages/AdminBookingSettingsPage';
import { AdminEmailTemplatesPage } from './pages/AdminEmailTemplatesPage';
import { AdminScheduleConfigPage } from './pages/AdminScheduleConfigPage';
import { ViewSchedulesPage } from './pages/ViewSchedulesPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { StudentBookingPage } from './pages/StudentBookingPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { PublicCalendarPage } from './pages/PublicCalendarPage';
import { ReschedulePage } from './pages/ReschedulePage';
import { NurseAssignmentPage } from './pages/NurseAssignmentPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { CampusManagementPage } from './pages/CampusManagementPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { StudentRoute } from './components/StudentRoute';
import { StaffRoute } from './components/StaffRoute';
import { EmployeeLayout } from './components/layout';
import { ClinicStaffRoute } from './components/ClinicStaffRoute';
import { SupervisorRoute } from './components/SupervisorRoute';
import { HRRoute } from './components/HRRoute';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import { HRDashboardPage } from './pages/HRDashboardPage';

function PrivacyPolicyEntryRoute() {
  const { profile, isAuthenticated } = useAuthStore();

  if (isAuthenticated && profile) {
    if (profile.role === 'hr') {
      return <Navigate to="/hr/privacy-policy" replace />;
    }
    if (['supervisor', 'nurse', 'doctor', 'admin'].includes(profile.role)) {
      return <Navigate to="/app/privacy-policy" replace />;
    }
  }

  return <PrivacyPolicyPage />;
}

// Redirects users based on their role — only rendered after isInitialized is true
function RoleBasedRedirect() {
  const { profile, logout } = useAuthStore();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Server-assigned staff roles always go straight to their dashboards (#13)
  if (profile.role === 'hr') {
    return <Navigate to="/hr/dashboard" replace />;
  }
  if (profile.role === 'admin' || profile.role === 'supervisor' || profile.role === 'nurse') {
    return <Navigate to="/supervisor/dashboard" replace />;
  }

  // Pending users who already selected a role are NOT allowed in until approved (#17)
  if (profile.role === 'pending' && profile.role_selected === true) {
    // Sign them out and return to login
    logout();
    return <Navigate to="/login" replace state={{ pendingApproval: true }} />;
  }

  // New users who haven't selected a role yet → role selection page
  if (profile.role_selected === false || profile.role === 'pending') {
    return <Navigate to="/select-role" replace />;
  }
  if (profile.role === 'student') {
    return <Navigate to="/student/booking" replace />;
  }
  if (profile.role === 'staff') {
    return <Navigate to="/staff/booking" replace />;
  }
  // Fallback
  return <Navigate to="/supervisor/dashboard" replace />;
}

function App() {
  const { initialize, isInitialized } = useAuthStore();
  const [initTimedOut, setInitTimedOut] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isInitialized) {
      setInitTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setInitTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isInitialized]);

  // Single global loading gate — renders ONE spinner for the whole app
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maroon-800">
        {initTimedOut ? (
          <div className="text-center text-white px-6">
            <div className="text-xl font-bold mb-2">Unable to load</div>
            <p className="text-white/70 text-sm mb-4">The app is taking longer than expected to start.</p>
            <button
              onClick={() => { setInitTimedOut(false); globalThis.location.reload(); }}
              className="px-4 py-2 bg-white text-maroon-800 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        ) : (
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        )}
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/calendar" element={<PublicCalendarPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyEntryRoute />} />
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

      {/* Role Selection (new users) */}
      <Route
        path="/select-role"
        element={
          <ProtectedRoute>
            <RoleSelectionPage />
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
      <Route
        path="/student/profile"
        element={
          <StudentRoute>
            <StudentProfilePage />
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
      <Route
        path="/staff/profile"
        element={
          <StaffRoute>
            <StudentProfilePage />
          </StaffRoute>
        }
      />

      {/* Supervisor/Nurse Routes — single persistent SidebarLayout via EmployeeLayout */}
      <Route element={<EmployeeLayout />}>
        <Route path="/supervisor/dashboard" element={<SupervisorRoute><DashboardPage /></SupervisorRoute>} />
        <Route path="/employee/dashboard" element={<SupervisorRoute><DashboardPage /></SupervisorRoute>} /> {/* Legacy redirect */}
        <Route path="/appointments" element={<ClinicStaffRoute><AppointmentsPage /></ClinicStaffRoute>} />
        <Route path="/schedule" element={<ClinicStaffRoute><SchedulePage /></ClinicStaffRoute>} />
        <Route path="/schedule/day/:date" element={<ClinicStaffRoute><ScheduleDayPage /></ClinicStaffRoute>} />
        <Route path="/reschedule" element={<ClinicStaffRoute><ReschedulePage /></ClinicStaffRoute>} />
        <Route path="/profile" element={<ClinicStaffRoute><ProfilePage /></ClinicStaffRoute>} />
        <Route path="/supervisor/nurses" element={<SupervisorRoute><NurseAssignmentPage /></SupervisorRoute>} />
        <Route path="/supervisor/audit-logs" element={<SupervisorRoute><AuditLogsPage /></SupervisorRoute>} />
        <Route path="/supervisor/campuses" element={<SupervisorRoute><CampusManagementPage /></SupervisorRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/booking-settings" element={<AdminRoute><AdminBookingSettingsPage /></AdminRoute>} />
        <Route path="/admin/email-templates" element={<AdminRoute><AdminEmailTemplatesPage /></AdminRoute>} />
        <Route path="/admin/schedule-config" element={<AdminRoute><AdminScheduleConfigPage /></AdminRoute>} />
        <Route path="/admin/campuses" element={<AdminRoute><CampusManagementPage /></AdminRoute>} />
        <Route path="/app/privacy-policy" element={<ClinicStaffRoute><PrivacyPolicyPage embedded /></ClinicStaffRoute>} />
      </Route>

      {/* HR Dashboard — standalone page, no sidebar */}
      <Route path="/hr/dashboard" element={<HRRoute><HRDashboardPage /></HRRoute>} />
      <Route path="/hr/privacy-policy" element={<HRRoute><PrivacyPolicyPage /></HRRoute>} />
    </Routes>
  );
}

export default App;
