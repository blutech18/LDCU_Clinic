# LDCU Clinic - GitHub Issues Fix Implementation Plan

## Priority Grouping & File Mapping

### Batch 1: Critical Security & Logic Bugs (Issues #17, #42, #41, #32, #19)
| Issue | Title | File(s) |
|-------|-------|---------|
| #17 | Pending accounts can login | `auth/store.ts`, `RoleSelectionPage.tsx` |
| #42 | Appointments on past dates (Admin) | `ScheduleDayPage.tsx` |
| #41 | Appointments on closed dates (Admin) | `ScheduleDayPage.tsx` |
| #32 | Appointments on holiday dates (Admin) | `ScheduleDayPage.tsx` |
| #19 | Excluded weekends accessible (Admin) | `ScheduleDayPage.tsx` |

### Batch 2: Schedule & Calendar Logic (Issues #38, #43, #29, #27, #6)
| Issue | Title | File(s) |
|-------|-------|---------|
| #38 | Closed dates show "Full" for guests | `LoginPage.tsx` |
| #43 | Cursor on non-interactive dates | `StudentBookingPage.tsx` |
| #29 | Calendar bg not updating when full | `StudentBookingPage.tsx` |
| #27 | Reschedule allows fully booked dates | `ReschedulePage.tsx` |
| #6 | Appointments visible across campuses | `StudentBookingPage.tsx` |

### Batch 3: Capacity & Validation (Issues #40, #26, #5, #36, #33, #34, #16)
| Issue | Title | File(s) |
|-------|-------|---------|
| #40 | Supervisor can edit capacity | `SchedulePage.tsx` |
| #26 | Max slots exceeds slider limit | `ScheduleDayPage.tsx` |
| #5 | Max bookings input prevents editing | `AdminBookingSettingsPage.tsx` |
| #36 | Email template textarea overflow | `SchedulePage.tsx` |
| #33/#34/#16 | Date year accepts 6 digits | `ReschedulePage.tsx`, `AppointmentsPage.tsx`, `AuditLogsPage.tsx` |

### Batch 4: UI/UX Issues (Issues #8, #9, #11, #23, #25, #30, #35, #39)
| Issue | Title | File(s) |
|-------|-------|---------|
| #8 | Avatar displays oval | `AdminUsersPage.tsx` |
| #9 | Student profile name field border | `StudentProfilePage.tsx` |
| #11 | Profile pic not in user management | `AdminUsersPage.tsx` |
| #23 | Cursor inconsistencies (Admin) | Various admin pages |
| #25 | "Service Type" vs "Appointment Type" | `StudentBookingPage.tsx`, `ScheduleDayPage.tsx` |
| #30 | Role selection UI misaligned | `AdminUsersPage.tsx` |
| #35 | Notes field not visible | `StudentBookingPage.tsx`, `ScheduleDayPage.tsx` |
| #39 | Duplicate "Assign" fields | `NurseAssignmentPage.tsx` |

### Batch 5: Appointments & Audit (Issues #12, #22, #18, #14, #24, #28, #31)
| Issue | Title | File(s) |
|-------|-------|---------|
| #12 | "No Show" status editable | `AppointmentsPage.tsx` |
| #22 | Pagination ignores role filter | `AuditLogsPage.tsx` |
| #18 | Search by name not filtering | `AuditLogsPage.tsx` |
| #14 | User filter not searchable | `AuditLogsPage.tsx` |
| #24 | Campus filter dropdown empty | `AppointmentsPage.tsx` |
| #28 | AM/PM handling in reminders | `ScheduleDayPage.tsx` |
| #31 | Missing clear for "Ends at" | `ScheduleDayPage.tsx` |

### Batch 6: Auth & Navigation (Issues #13, #20, #10, #37, #7)
| Issue | Title | File(s) |
|-------|-------|---------|
| #13 | Relogin redirects to role select | `auth/store.ts` |
| #20 | Privacy Policy nav bug | `StudentBookingPage.tsx` layout |
| #10 | Supervisor profile update fails | `ProfilePage.tsx` |
| #37 | Nurse campus not recognized | `auth/store.ts`, `SchedulePage.tsx` |
| #7 | Name field char limits | `StudentProfilePage.tsx` |

### Batch 7: Template Editor (Issue #15)
| Issue | Title | File(s) |
|-------|-------|---------|
| #15 | Cursor resets in template editor | `SchedulePage.tsx` |
