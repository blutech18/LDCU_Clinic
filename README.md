<div align="center">

<img src="public/ldcu-logo.png" alt="LDCU Logo" width="100"/>

# LDCU Medical & Dental Clinic System
### *Liceo de Cagayan University — Campus Health Services*

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.io)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## 📋 Overview

The **LDCU Clinic System v2** is a full-stack web application for managing medical and dental appointments at Liceo de Cagayan University. The platform streamlines appointment booking, schedule management, nurse assignment, and administrative oversight for all campus clinics.

### ✨ Key Features

| Feature | Description |
|---|---|
| 🗓️ **Online Appointment Booking** | Students and staff book medical/dental appointments online |
| 🏥 **Multi-Campus Support** | Each campus has its own staff, schedule, and booking quotas |
| 👮 **Role-Based Access Control** | 7 distinct roles with isolated access per route |
| 📅 **Schedule Management** | Supervisors configure available days, holidays, and daily slot limits |
| 👩‍⚕️ **Nurse Assignment** | Supervisors assign nurses to specific days and campuses |
| 📊 **Admin Dashboard** | Stats, appointment counts, patient records, and audit logs |
| 🔒 **Security** | Rate-limited login, idle session timeout, Row-Level Security (RLS), force re-auth |
| 📧 **Email Notifications** | Configurable email templates for booking confirmation and status updates |
| ♻️ **Rescheduling** | Clinic staff can reschedule appointments with reason tracking |
| 🔎 **Audit Logs** | All sensitive actions are logged with actor, target, and timestamp |

---

## 🛠️ Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 5.4 | Build tool & dev server |
| React Router DOM | 6.28 | Client-side routing |
| Zustand + Immer | 4.5 | Global state management |
| Tailwind CSS | 3.4 | Utility-first styling |
| Framer Motion | 12.x | Page/sidebar animations |
| Lucide React | 0.561 | Icon library |
| date-fns | 4.x | Date formatting & math |
| Zod | 4.x | Schema validation |

### Backend (Supabase)
| Service | Usage |
|---|---|
| PostgreSQL | Relational database (profiles, appointments, schedules, etc.) |
| Supabase Auth | Email/password + Google OAuth |
| Row-Level Security (RLS) | Per-table, per-role data access control |
| PostgreSQL Functions | Atomic booking (`book_appointment()`), rate limiting, login tracking |
| Supabase Edge Functions | Account deletion (cascading cleanup) |
| pg_cron | Scheduled cleanup of expired data |

### Deployment
- **Frontend**: Vercel (SPA with `vercel.json` rewrites)
- **Database**: Supabase Cloud (PostgreSQL)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.io) project

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ldcuclinic-v2.git
cd ldcuclinic-v2

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

Run the SQL scripts in Supabase SQL Editor in the following order:

```
1. supabase/setup_tables.sql          — Core tables
2. supabase/add_role_selection.sql    — Role enum updates
3. supabase/add_login_ratelimit.sql   — Login rate limiting
4. supabase/create_audit_logs.sql     — Audit log table
5. supabase/book_appointment.sql      — Atomic booking function
6. supabase/create_nurse_invitations.sql
7. supabase/add_am_pm_booking.sql
8. supabase/add_cleanup_cron.sql      — Cron cleanup jobs
```

Also run `fix_rls_policies.sql` and `fix_remaining_rls.sql` as needed.

### Running Locally

```bash
npm run dev
# App available at http://localhost:5173
```

### Build for Production

```bash
npm run build
```

---

## 🗂️ Project Structure

```
ldcuclinic-v2/
├── public/                  # Static assets (logo, icons)
├── src/
│   ├── App.tsx              # Root router — all routes defined here
│   ├── main.tsx             # App entry point
│   ├── index.css            # Global CSS / Tailwind base
│   ├── pages/               # Page-level components (one per route)
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── StudentBookingPage.tsx
│   │   ├── SchedulePage.tsx / ScheduleDayPage.tsx
│   │   ├── AppointmentsPage.tsx
│   │   ├── DashboardPage.tsx / HRDashboardPage.tsx
│   │   ├── AdminPage.tsx / AdminUsersPage.tsx
│   │   ├── AdminBookingSettingsPage.tsx
│   │   ├── AdminEmailTemplatesPage.tsx
│   │   ├── AdminScheduleConfigPage.tsx
│   │   ├── NurseAssignmentPage.tsx
│   │   ├── AuditLogsPage.tsx
│   │   ├── ReschedulePage.tsx
│   │   ├── ProfilePage.tsx / StudentProfilePage.tsx
│   │   ├── PublicCalendarPage.tsx
│   │   ├── RoleSelectionPage.tsx
│   │   ├── AuthCallbackPage.tsx
│   │   └── PrivacyPolicyPage.tsx
│   ├── components/          # Shared components & route guards
│   │   ├── AdminRoute.tsx / SupervisorRoute.tsx
│   │   ├── ClinicStaffRoute.tsx / NurseRoute.tsx
│   │   ├── HRRoute.tsx / StaffRoute.tsx / StudentRoute.tsx
│   │   ├── ProtectedRoute.tsx / EmployeeRoute.tsx
│   │   └── layout/
│   │       ├── SidebarLayout.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   ├── modules/
│   │   ├── auth/store.ts    # Zustand auth store (login, register, idle timeout)
│   │   ├── appointments/    # Appointment state & helpers
│   │   ├── schedule/        # Schedule config state
│   │   ├── admin/           # Admin module state
│   │   └── hr/              # HR module state
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client initialization
│   │   ├── email.ts         # Email template helpers
│   │   ├── validation.ts    # Zod validation schemas
│   │   ├── auditLog.ts      # Audit log helper
│   │   └── utils.ts         # Utility functions
│   └── types/               # Shared TypeScript types/interfaces
├── supabase/                # SQL migration scripts
│   ├── setup_tables.sql
│   ├── book_appointment.sql
│   └── ...
├── vercel.json              # Vercel SPA rewrites + security headers
└── package.json
```

---

## 🗃️ Database Schema

| Table | Description |
|---|---|
| `profiles` | User profiles with role, campus, department, verification status |
| `appointments` | Appointment records (patient, type, date, time slot, status) |
| `campuses` | Campus definitions |
| `departments` | Academic departments linked to campuses |
| `schedule_config` | Per-campus schedule settings (weekend toggles, holidays) |
| `booking_settings` | Max bookings per day per campus |
| `day_overrides` | Per-date booking limit overrides (closed days, custom max) |
| `nurse_assignments` | Which nurse is assigned to which campus+date |
| `email_templates` | Customizable email templates per campus and type |
| `pending_emails` | Email queue for outgoing notifications |
| `audit_logs` | Action audit trail (actor, action, target, timestamp) |
| `login_attempts` | Rate-limiting table for failed login tracking |
| `nurse_invitations` | Nurse invitation tokens |

### Key Enum Types

```sql
user_role:          'admin' | 'supervisor' | 'nurse' | 'hr' | 'staff' | 'student' | 'pending'
appointment_type:   'consultation' | 'dental'
appointment_status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
time_of_day:        'AM' | 'PM'
```

### Database Relationships

```
campuses
  ├── profiles (campus_id)
  │     └── appointments (patient_id)
  ├── departments (campus_id)
  │     └── profiles (department_id)
  ├── schedule_config (campus_id) [1:1]
  ├── booking_settings (campus_id) [1:1]
  ├── day_overrides (campus_id)
  ├── nurse_assignments (campus_id)
  ├── email_templates (campus_id)
  └── appointments (campus_id)

audit_logs
  ├── actor_id → profiles.id
  └── target_id → profiles.id (optional)
```

---

## 👥 User Roles & Significance

The system defines **7 roles** enforced at the route, component, and database (RLS) levels.

### Role Descriptions

| Role | Who | Capabilities |
|---|---|---|
| `admin` | System administrator | Full access — user management, system configuration, all admin pages |
| `supervisor` | Clinic head nurse / manager | Dashboard, appointments, schedule config, nurse assignment, audit logs |
| `nurse` | Clinic nurse | View/manage appointments, view schedule, profile |
| `hr` | Human Resources officer | Standalone HR dashboard — approves or rejects staff role requests |
| `staff` | University employee | Book appointments, view their own bookings, manage profile |
| `student` | LDCU student | Book appointments, view their own booking, manage student profile |
| `pending` | New user (role not yet set) | Role selection page only; limited booking while awaiting HR approval |

### Role Transition Diagram

```
Register (email/password)
         │
         ▼
     [pending]
         │
         ▼
  RoleSelectionPage
         │
    ┌────┴────┐
    ▼         ▼
"Student"  "Staff"
    │         │
    ▼         ▼
[student]  pending + role_selected=true
           (can access booking while waiting)
                 │
            HR reviews
                 │
         ┌───────┴────────┐
         ▼                ▼
      [staff]        stays [pending]

Admin can manually assign any role at any time.
Role change triggers force_reauth_at → user must re-login immediately.
```

### Route Access Matrix

| Route | admin | supervisor | nurse | hr | staff | student | pending |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/` Home | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/calendar` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/select-role` | — | — | — | — | — | — | ✅ |
| `/student/booking` | — | — | — | — | — | ✅ | ✅* |
| `/staff/booking` | — | — | — | — | ✅ | — | — |
| `/hr/dashboard` | — | — | — | ✅ | — | — | — |
| `/supervisor/dashboard` | — | ✅ | — | — | — | — | — |
| `/appointments` | — | ✅ | ✅ | — | — | — | — |
| `/schedule` | — | ✅ | ✅ | — | — | — | — |
| `/reschedule` | — | ✅ | ✅ | — | — | — | — |
| `/supervisor/nurses` | — | ✅ | — | — | — | — | — |
| `/supervisor/audit-logs` | — | ✅ | — | — | — | — | — |
| `/admin` (User Mgmt) | ✅ | — | — | — | — | — | — |
| `/admin/booking-settings` | ✅ | — | — | — | — | — | — |
| `/admin/email-templates` | ✅ | — | — | — | — | — | — |
| `/admin/schedule-config` | ✅ | — | — | — | — | — | — |

> \* `pending` users who already selected "staff" can access `/student/booking` while awaiting HR approval.

---

## 🔄 System Flow Sequences

### 1. Authentication Flow

#### Email & Password Login
```
User enters email + password
        │
        ▼
check_login_rate_limit() RPC
        ├── BLOCKED → Show lockout error (minutes remaining)
        └── ALLOWED ──► supabase.auth.signInWithPassword()
                                │
                                ├── FAIL → record_login_attempt(success=false)
                                └── SUCCESS → record_login_attempt(success=true)
                                              Fetch profile from `profiles` table
                                                      │
                                                      ├── is_verified=false → Sign out + error
                                                      └── OK → Set profile in Zustand store
                                                               Start 30-min idle watcher
                                                               → RoleBasedRedirect
```

#### Google OAuth Login
```
Click "Sign in with Google"
        │
        ▼
supabase.auth.signInWithOAuth({ provider: 'google' })
        │
        ▼
Browser → Google consent → redirects to /auth/callback
        │
        ▼
AuthCallbackPage exchanges code → session established
        │
        ▼
Profile fetched / auto-created → RoleBasedRedirect
```

#### App Load / Session Restore
```
App mounts → initialize()
        │
        ▼
supabase.auth.getSession()
        ├── No session → show login
        └── Session found → fetch profile
                │
                ├── force_reauth_at > last_sign_in_at → Sign out (role was changed by admin)
                ├── is_verified=false → Sign out
                └── OK → Set profile, start idle timer
```

> **Idle Timeout**: After 30 minutes of no user activity (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`), the session is automatically terminated.

---

### 2. New User Onboarding Flow

```
1. Visit / (Home) → click Login/Register
2. Register: email + password + name
   → Supabase creates auth.users entry
   → profiles row: role='pending', is_verified=false

3. Log in → role='pending' → /select-role

4a. Select "Student"
    → profile.role = 'student', role_selected = true
    → Redirect to /student/booking ✅

4b. Select "Staff / Employee"
    → requested_role = 'staff', role_selected = true
    → role stays 'pending'
    → Redirect to /student/booking (limited access)

5. HR sees pending request on /hr/dashboard
   → Approve: role = 'staff', force_reauth_at set
   → Reject: stays pending
```

---

### 3. Appointment Booking Flow (Student / Staff)

```
Visit /student/booking or /staff/booking
        │
        ▼
Page loads: fetches schedule config, booking settings,
            day overrides, user's existing appointments
        │
        ▼
User selects:
  1. Appointment type (Medical / Dental)
  2. Date (calendar — grayed out: weekends, holidays, full days)
  3. Time slot: AM or PM
        │
        ▼
Client validation (Zod):
  - Date must be future
  - AM/PM must be available
  - No existing 'scheduled' appointment
        │
        ▼
Submit → book_appointment() PostgreSQL RPC
        ├── ALREADY_BOOKED → error shown
        ├── FULLY_BOOKED / FULLY_BOOKED_AM / FULLY_BOOKED_PM → error shown
        └── SUCCESS → appointment row inserted
                      Email queued in pending_emails
                      Confirmation shown to user
```

#### Booking Business Rules

| Rule | Detail |
|---|---|
| One active booking per user | Cannot book if already have a `scheduled` appointment |
| Per-campus isolation | Slot counts are scoped per campus, never global |
| Day Overrides | Supervisors can close specific dates or set custom max slots |
| AM/PM sub-limits | Overrides can set separate AM and PM capacities |
| Race condition safety | PostgreSQL advisory lock — one booking per campus+date at a time |

---

### 4. Atomic Booking — Race Condition Prevention

The `book_appointment()` PostgreSQL function prevents double-booking:

```
User A and User B simultaneously book the last slot:

User A                              User B
  │                                   │
  ▼                                   ▼
book_appointment() called         book_appointment() called
  │                                   │
  ▼                                   │
pg_advisory_xact_lock(key)       ← WAITS (key is locked)
  │
Count bookings = 9, max = 10
Insert appointment ✅
Commit → lock released
                                       │
                                       ▼
                               Lock acquired
                               Count bookings = 10, max = 10
                               RAISE EXCEPTION 'FULLY_BOOKED' ❌

Lock key = abs(hashtext(campus_id || appointment_date))
→ Different campuses/dates never block each other
```

---

### 5. Clinic Staff Daily Workflow

#### Appointments (`/appointments`)
```
AppointmentsPage:
  - Filter by date, status, type, campus
  - Mark as Completed / Cancelled
  - View patient details
  - Click Reschedule → ReschedulePage
```

#### Schedule View (`/schedule` → `/schedule/day/:date`)
```
Calendar shows per-day:
  - Booked count (AM / PM breakdown)
  - Assigned nurse
Click a day → full appointment list with action buttons
```

#### Rescheduling
```
Select appointment → Reschedule
  - Pick new date (respects schedule rules)
  - Enter reason (required)
  - Submit → original_date logged, reason stored
             Audit log entry created
             Email notification queued
```

---

### 6. Supervisor Workflow

| Feature | Location | Actions |
|---|---|---|
| Dashboard | `/supervisor/dashboard` | Stats by status/type, daily trend, today's list |
| Nurse Assignment | `/supervisor/nurses` | Assign/unassign nurses to dates per campus |
| Schedule Config | `/schedule` + day view | Configure available days, holidays, slot limits, overrides |
| Audit Logs | `/supervisor/audit-logs` | View all sensitive actions with actor, target, timestamp |

---

### 7. HR Dashboard Flow

HR has a **standalone page** (no sidebar) at `/hr/dashboard`:

```
HR logs in → /hr/dashboard
        │
        ▼
View pending staff role requests:
  Each card: name, email, department, date requested
        │
        ├── Approve → role = 'staff', is_verified = true
        │             force_reauth_at set → forces user re-login
        └── Reject  → stays pending
```

---

### 8. Admin Workflow

| Section | Path | Capabilities |
|---|---|---|
| User Management | `/admin` | List/search/filter users, change role, verify, invite nurse, delete |
| Booking Settings | `/admin/booking-settings` | Set `max_bookings_per_day` per campus |
| Email Templates | `/admin/email-templates` | Edit/preview email templates per campus and type |
| Schedule Config | `/admin/schedule-config` | Toggle weekend availability, add/remove holidays per campus |

**Role change triggers session invalidation**: setting a user's role updates `force_reauth_at`. On their next page load, the app detects this and signs them out, forcing a fresh login with the new role applied.

---

### 9. Email Notification Flow

```
Appointment booked / cancelled / rescheduled
        │
        ▼
Frontend inserts row into pending_emails:
  { to_email, subject, body, status: 'pending' }
        │
        ▼
Background process (pg_cron / Edge Function):
  Reads pending_emails WHERE status = 'pending'
  Sends via Resend API
  Updates status = 'sent' or 'failed'
        │
        ▼
Patient receives email with appointment details

Templates are customizable per campus via /admin/email-templates.
Variables: {{patient_name}}, {{date}}, {{time}}, {{type}}, {{campus}}
```

---

## 🔒 Security Architecture

### Layered Security Model

```
Layer 1 — Vercel HTTP Headers (vercel.json)
  ├── X-Frame-Options: DENY            ← Prevents clickjacking
  ├── X-Content-Type-Options: nosniff
  ├── Strict-Transport-Security (HSTS)
  ├── X-XSS-Protection: 1; mode=block
  └── Content-Security-Policy (strict allowlist)

Layer 2 — Supabase Auth
  ├── JWT session tokens (auto-refreshed)
  ├── Google OAuth provider
  └── Optional email verification

Layer 3 — React Route Guards
  ├── ProtectedRoute — blocks unauthenticated users
  ├── AdminRoute — role = 'admin' only
  ├── SupervisorRoute — role = 'supervisor' only
  ├── ClinicStaffRoute — supervisor OR nurse
  ├── HRRoute — role = 'hr' only
  ├── StaffRoute — role = 'staff' only
  └── StudentRoute — student or pending+role_selected

Layer 4 — PostgreSQL Row-Level Security (RLS)
  ├── profiles: own row read/update only
  ├── appointments: clinic staff manage; patients see their own
  ├── schedule_config / booking_settings: admin/supervisor write; all read
  └── audit_logs: insert open; select admin/supervisor only

Layer 5 — PostgreSQL Functions (SECURITY DEFINER)
  ├── book_appointment() — advisory lock + capacity checks
  ├── check_login_rate_limit() — lockout enforcement
  └── record_login_attempt() — failed attempt tracking
```

### Route Guard Flow

```
Request to a protected route
        │
        ▼
Route Guard (e.g. AdminRoute):
  isInitialized? ─── NO ──► Show loading spinner
      │ YES
  isAuthenticated? ─── NO ──► /login
      │ YES
  verifyRole(['admin']) ─── FAIL ──► /employee/dashboard
      │ PASS
  ✅ Render page component
```

---

## 🗺️ Full Route Map

| Path | Component | Guard | Accessible By |
|---|---|---|---|
| `/` | `HomePage` | None | Public |
| `/login` | `LoginPage` | None | Public |
| `/calendar` | `PublicCalendarPage` | None | Public |
| `/privacy-policy` | `PrivacyPolicyPage` | None | Public |
| `/view-schedules` | `ViewSchedulesPage` | None | Public |
| `/auth/callback` | `AuthCallbackPage` | None | OAuth redirect |
| `/select-role` | `RoleSelectionPage` | `ProtectedRoute` | Pending users |
| `/student/booking` | `StudentBookingPage` | `StudentRoute` | Student, Pending* |
| `/student/profile` | `StudentProfilePage` | `StudentRoute` | Student |
| `/staff/booking` | `StudentBookingPage` | `StaffRoute` | Staff |
| `/staff/profile` | `StudentProfilePage` | `StaffRoute` | Staff |
| `/hr/dashboard` | `HRDashboardPage` | `HRRoute` | HR |
| `/supervisor/dashboard` | `DashboardPage` | `SupervisorRoute` | Supervisor |
| `/appointments` | `AppointmentsPage` | `ClinicStaffRoute` | Supervisor, Nurse |
| `/schedule` | `SchedulePage` | `ClinicStaffRoute` | Supervisor, Nurse |
| `/schedule/day/:date` | `ScheduleDayPage` | `ClinicStaffRoute` | Supervisor, Nurse |
| `/reschedule` | `ReschedulePage` | `ClinicStaffRoute` | Supervisor, Nurse |
| `/profile` | `ProfilePage` | `ClinicStaffRoute` | Supervisor, Nurse |
| `/supervisor/nurses` | `NurseAssignmentPage` | `SupervisorRoute` | Supervisor |
| `/supervisor/audit-logs` | `AuditLogsPage` | `SupervisorRoute` | Supervisor |
| `/admin` | `AdminUsersPage` | `AdminRoute` | Admin |
| `/admin/booking-settings` | `AdminBookingSettingsPage` | `AdminRoute` | Admin |
| `/admin/email-templates` | `AdminEmailTemplatesPage` | `AdminRoute` | Admin |
| `/admin/schedule-config` | `AdminScheduleConfigPage` | `AdminRoute` | Admin |

---

<div align="center">
  <sub>Built with ❤️ for Liceo de Cagayan University · LDCU Clinic System v2.0.0</sub>
</div>
