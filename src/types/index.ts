export type UserRole = 'pending' | 'student' | 'staff' | 'supervisor' | 'nurse' | 'doctor' | 'admin' | 'hr';
export type AppointmentType = 'physical_exam' | 'consultation' | 'dental';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type UserType = 'student' | 'supervisor';

export interface AppointmentFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  campusId?: string;
  status?: AppointmentStatus;
  appointmentType?: AppointmentType;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: string;
  sex?: 'male' | 'female';
  contact_number?: string;
  role: UserRole;
  user_type?: UserType;
  student_id?: string;
  employee_id?: string;
  department_id?: string;
  college_id?: string;
  campus_id?: string;
  assigned_campus_id?: string; // For nurses - restricts access to specific campus
  phone?: string;
  is_verified?: boolean;
  requested_role?: string | null;
  role_selected?: boolean;
  avatar_url?: string;
  force_reauth_at?: string; // ISO timestamp — set by DB trigger when admin changes user role
  created_at: string;
  updated_at: string;
}

export interface Campus {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  campus_id: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string | null;
  campus_id: string;
  appointment_type: AppointmentType;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  time_of_day?: 'AM' | 'PM';
  notes?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  booker_role?: 'student' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface ScheduleSetting {
  id: string;
  campus_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_appointments: number;
  is_active: boolean;
}

export interface WeeklyLimit {
  id: string;
  appointment_type: AppointmentType;
  user_role: UserRole;
  max_appointments_per_week: number;
}

export interface BookingSetting {
  id: string;
  campus_id: string;
  max_bookings_per_day: number;
  max_am_bookings?: number;
  max_pm_bookings?: number;
  created_at: string;
  updated_at: string;
}

export interface College {
  id: string;
  name: string;
  campus_id: string;
  created_at: string;
}

export interface ScheduleConfig {
  id: string;
  campus_id: string;
  include_saturday: boolean;
  include_sunday: boolean;
  holiday_dates: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  campus_id: string;
  template_type: 'booking_confirmation' | 'appointment_reminder';
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface DayOverride {
  id: string;
  campus_id: string;
  override_date: string;
  is_closed: boolean;
  max_bookings: number;
  max_am_bookings?: number;
  max_pm_bookings?: number;
  notes?: string;
  created_at: string;
}
