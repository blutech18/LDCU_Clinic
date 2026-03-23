# LDCU Clinic v2 — Production Readiness Report

> Generated: March 23, 2026  
> Scope: Full codebase audit — concurrency, security, reliability, UX polish

---

## Summary

The system already has solid foundations: advisory-lock-based atomic booking, RLS policies, login rate limiting, session invalidation on role change, audit logging, PKCE auth flow, security headers, and an error boundary. Below are the **remaining gaps** organized by severity.

---

## 🔴 CRITICAL — Must Fix Before Production

### 1. Simultaneous Booking Race Condition (Client-Side Bypass)

**Status: DB-level is protected ✅ — Client-side has a gap ⚠️**

The `book_appointment()` PostgreSQL function uses `pg_advisory_xact_lock` which correctly serializes concurrent inserts at the DB level. However:

**Problem:** In `StudentBookingPage.tsx` (line 244-261), the "existing scheduled appointment" check reads from **stale in-memory state** (`myAppointments`). Two browser tabs can pass this check simultaneously because the Zustand store isn't shared across tabs.

**Fix needed:**
- Move the "one active booking per patient" check **inside** the `book_appointment()` SQL function so it's protected by the same advisory lock.
- The client-side check should remain as a UX convenience, but not be the sole guard.

```sql
-- Add inside book_appointment(), after the advisory lock:
IF EXISTS (
  SELECT 1 FROM appointments
  WHERE patient_id = p_patient_id
    AND status = 'scheduled'
) THEN
  RAISE EXCEPTION 'ALREADY_BOOKED: You already have a scheduled appointment.';
END IF;
```

### 2. Appointments Page Has No Route Guard

**File:** `App.tsx` line 144  
**Problem:** `/appointments` route is inside `<EmployeeLayout />` but has **no role guard wrapper** like `<SupervisorRoute>`. Any authenticated user (including students/staff who manually navigate to the URL) could access the appointments management page.

**Fix:** Wrap with `<SupervisorRoute>` or a new `<ClinicStaffRoute>` that allows supervisor/nurse/admin only.

### 3. Schedule and Reschedule Pages Also Unguarded

**File:** `App.tsx` lines 145-148  
**Problem:** `/schedule`, `/schedule/day/:date`, `/reschedule`, `/profile` inside `EmployeeLayout` have no explicit role guard. `EmployeeRoute` blocks students/staff but still allows **pending** and **hr** roles through.

**Fix:** Add explicit role checks for clinic-staff-only routes.

### 4. `setup_tables.sql` Has Overly Permissive RLS (Conflicting with `fix_rls_policies.sql`)

**Problem:** `setup_tables.sql` creates tables with `WITH CHECK (true)` on INSERT/UPDATE/DELETE for `email_templates`, `schedule_config`, `booking_settings`. While `fix_rls_policies.sql` later overrides these, if someone runs only `setup_tables.sql` (e.g., fresh setup), the system would have **wide-open write access** for any authenticated user.

**Fix:** Update `setup_tables.sql` to use the proper restrictive policies from the start, or add a comment/instruction that `fix_rls_policies.sql` MUST run after.

### 5. `pending_emails` Table — Any Authenticated User Can Read All Emails

**File:** `setup_tables.sql` line 47  
**Problem:** `pending_emails` SELECT policy is `USING (true)` for all authenticated users. This leaks all queued emails (with patient names, email addresses) to any logged-in user.

**Fix:** Restrict SELECT to admin/supervisor only.

---

## 🟠 HIGH — Should Fix Before Production

### 6. No AM/PM Capacity Check in `book_appointment()` SQL Function

**Problem:** The DB function checks total daily capacity but **not** AM/PM sub-limits from `day_overrides.max_am_bookings` / `max_pm_bookings`. Two users could simultaneously book the last AM slot because the function only checks total count.

**Fix:** Add AM/PM counting inside the advisory-locked function when `max_am_bookings`/`max_pm_bookings` are set.

### 7. `fetchAppointments` in Appointment Store — Fetches User Profile on Every Call

**File:** `src/modules/appointments/store.ts` lines 51-57  
**Problem:** Every call to `fetchAppointments()` makes **two extra queries** (`getUser()` + profile SELECT) to determine nurse campus filtering. For pages that call this on mount + month change, this is wasteful and slow.

**Fix:** Pass the profile/role as a parameter or read from the auth store instead of querying the DB each time.

### 8. `LoginPage` Fetches Appointments for Unauthenticated Users

**File:** `src/pages/LoginPage.tsx` lines 46-53  
**Problem:** The login/landing page calls `fetchAppointments()` which internally calls `supabase.auth.getUser()` and queries `profiles` — for unauthenticated users this will fail silently but wastes API calls. Also, anonymous users shouldn't see appointment data at all.

**Fix:** Use a public-facing count-only query for the landing calendar, not the full appointment fetch. Or gate the fetch behind authentication.

### 9. `PublicCalendarPage` Uses Stale Store Data

**File:** `src/pages/PublicCalendarPage.tsx`  
**Problem:** This page reads `appointments` from the store but never fetches them. It relies on whatever was last loaded. If a user visits this page directly, the calendar will show **no data**.

**Fix:** Add a `useEffect` to fetch booking counts for the displayed month range, similar to `LoginPage`.

### 10. `delete-account` Edge Function Missing CORS Headers

**File:** `supabase/functions/delete-account/index.ts`  
**Problem:** Unlike `send-email`, the `delete-account` function does **not set CORS headers** and has no OPTIONS handler. This will cause browser CORS errors when called from the frontend.

**Fix:** Add the same `corsHeaders` pattern used in `send-email`.

### 11. `rescheduleDate` — No Advisory Lock / Concurrency Protection

**File:** `src/modules/appointments/store.ts` lines 249-343  
**Problem:** The reschedule logic loops through appointment IDs and updates them one-by-one **without any DB-level locking**. If two supervisors reschedule simultaneously, they could overbook target dates.

**Fix:** Create a server-side `reschedule_appointments()` SQL function with advisory locking, similar to `book_appointment()`.

### 12. Console Logs Left in Production Code

**File:** `StudentBookingPage.tsx` lines 237-254  
**Problem:** Multiple `console.log('Booking check:...')` and `console.log('Checking appointment:...')` statements will appear in users' browser consoles, potentially leaking internal data.

**Fix:** Remove or gate behind `import.meta.env.DEV`.

---

## 🟡 MEDIUM — Important for Polish

### 13. No Input Sanitization on `notes` Field

**Problem:** The `notes` field in the booking form is passed directly to the DB. While Supabase parameterizes queries (preventing SQL injection), there's no XSS protection if notes are ever rendered as HTML.

**Fix:** Sanitize or escape HTML entities before storing/rendering notes.

### 14. Contact Number Validation Is Weak

**File:** `StudentBookingPage.tsx` line 226  
**Problem:** Only checks `trim().length !== 11`. Doesn't validate that it's actually digits, starts with '09', etc.

**Fix:**
```typescript
const phoneRegex = /^09\d{9}$/;
if (!phoneRegex.test(contactNumber.trim())) {
  setBookingError('Please enter a valid Philippine mobile number (e.g., 09171234567).');
  return;
}
```

### 15. No Loading/Disabled State During Booking Submission

**File:** `StudentBookingPage.tsx`  
**Problem:** When `handleBookAppointment` is running, the submit button isn't visibly disabled (the `isSaving` state exists in the store but isn't used to disable the button). Users can click multiple times.

**Fix:** Disable the submit button and show a spinner when `isSaving` is true.

### 16. Hardcoded URLs in Email Templates

**File:** `src/lib/email.ts` line 104  
**Problem:** `https://ldcu-clinic.vercel.app/` is hardcoded. If the domain changes, emails will link to the wrong URL.

**Fix:** Use an environment variable like `VITE_APP_URL` or configure in Supabase.

### 17. `register` Function Sets Role to 'supervisor' by Default

**File:** `src/modules/auth/store.ts` line 352  
**Problem:** `role: 'supervisor'` is hardcoded in the register function. New registrants get supervisor role immediately (though `is_verified: false` mitigates this partially).

**Fix:** Set to `'pending'` and require admin verification before granting any elevated role.

### 18. No Pagination on Appointments Page

**File:** `src/pages/AppointmentsPage.tsx`  
**Problem:** `fetchAppointments()` loads **all** appointments with no limit. With hundreds/thousands of records, this will be slow and consume excessive memory.

**Fix:** Add server-side pagination with `.range(offset, offset + limit)` and UI pagination controls.

### 19. `booking_settings` Index Missing for Composite Key

**Problem:** The `book_appointment()` function joins `booking_settings` on `campus_id` but there's no explicit index. With many campuses, this could slow down.

**Fix:** Already mitigated by the `UNIQUE(campus_id)` constraint, but confirm the index exists in production.

### 20. External API Call in Schedule Store (`syncPhHolidays`)

**File:** `src/modules/schedule/store.ts` line 259  
**Problem:** Directly calls `https://date.nager.at/api/v3/PublicHolidays/` from the client. This third-party API could go down, change format, or be blocked by CSP.

**Fix:** Proxy through a Supabase Edge Function or cache the results in the DB with a refresh interval.

---

## 🟢 LOW — Nice to Have

### 21. No Optimistic UI Updates

Booking, status changes, and deletions wait for the server response before updating the UI. Adding optimistic updates with rollback would make the app feel faster.

### 22. No Retry Logic for Failed Email Sends

The `pending_emails` fallback table exists but there's no automated job to retry sending them. Set up a Supabase cron job or Edge Function to process the queue.

### 23. No `updated_at` Auto-Update Trigger

Tables like `appointments`, `email_templates`, etc. have `updated_at` columns but rely on the client to set them. A DB trigger would be more reliable.

### 24. Missing `Strict-Transport-Security` (HSTS) Header

**File:** `vercel.json`  
Add: `"Strict-Transport-Security": "max-age=31536000; includeSubDomains"` for HTTPS enforcement.

### 25. Schedule Store Uses `persist` Middleware

**File:** `src/modules/schedule/store.ts` line 392  
The schedule store persists `selectedCampusId` to localStorage. If a user switches between campus contexts, stale data could show briefly on reload. Consider if this is actually needed.

### 26. `login_attempts` Cleanup Could Grow Unbounded

The cleanup in `record_login_attempt` only runs when someone logs in. If no one logs in for a while, old records accumulate. Set up the suggested cron job: `SELECT cron.schedule(...)`.

### 27. No Service Worker / Offline Support

For a clinic with potentially spotty internet, a basic service worker for caching static assets would improve reliability.

### 28. Missing `<meta>` Description and Open Graph Tags

For SEO and link previews when sharing the clinic URL.

---

## ✅ What's Already Done Well

| Area | Status |
|------|--------|
| Advisory-lock atomic booking (`book_appointment()`) | ✅ Solid |
| RLS policies on all tables | ✅ Good (with fix_rls_policies.sql) |
| Login brute-force protection | ✅ rate limiting with lockout |
| Session invalidation on role change | ✅ trigger + frontend check |
| PKCE auth flow | ✅ best practice |
| Security headers (CSP, X-Frame, etc.) | ✅ comprehensive |
| Idle session timeout (30 min) | ✅ good for shared computers |
| Error boundary | ✅ prevents white screen |
| Audit logging (server-side user_id) | ✅ tamper-resistant |
| Unique index preventing duplicate bookings | ✅ DB-level guard |
| Email confirmation with fallback queue | ✅ resilient |
| Role-based route guards | ✅ (with gaps noted above) |
| Force re-auth trigger on role change | ✅ prevents stale sessions |

---

## Recommended Fix Priority

| Priority | Items | Effort |
|----------|-------|--------|
| **Do first** | #1 (DB-level patient check), #2-#3 (route guards), #5 (email leak) | ~2-3 hours |
| **Do second** | #6 (AM/PM capacity), #10 (CORS), #11 (reschedule lock), #12 (console.log) | ~3-4 hours |
| **Do third** | #14 (phone validation), #15 (button disable), #16 (hardcoded URL), #17 (default role) | ~2 hours |
| **Do later** | #7-#9 (perf), #13 (sanitize), #18 (pagination), #20 (API proxy) | ~4-6 hours |
| **Nice to have** | #21-#28 | ~varies |

---

*Would you like me to implement any of these fixes? I recommend starting with the critical items (#1-#5).*
