import { z } from 'zod';

// ─── Phone Number Validation ─────────────────────────────────────────────────
// Philippine phone numbers: +63 followed by 10 digits, or 11 digits starting with 09
const phoneRegex = /^(\+63|0)?9\d{9}$/;

// ─── Common Validation Schemas ───────────────────────────────────────────────

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

export const phoneSchema = z.string()
  .regex(phoneRegex, 'Invalid Philippine phone number (e.g., 09123456789 or +639123456789)')
  .trim()
  .optional()
  .or(z.literal(''));

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods')
  .trim();

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime());
  }, 'Invalid date');

export const uuidSchema = z.string()
  .uuid('Invalid UUID format');

// ─── User Registration Validation ────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  middleName: nameSchema.optional().or(z.literal('')),
  dateOfBirth: dateSchema.optional(),
  sex: z.enum(['male', 'female']).optional(),
  contactNumber: phoneSchema,
  campusId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Login Validation ────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Profile Update Validation ───────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  middleName: nameSchema.optional().or(z.literal('')),
  dateOfBirth: dateSchema.optional(),
  sex: z.enum(['male', 'female']).optional(),
  contactNumber: phoneSchema,
  departmentId: uuidSchema.optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ─── Appointment Booking Validation ──────────────────────────────────────────

export const appointmentSchema = z.object({
  patientId: uuidSchema.optional(),
  campusId: uuidSchema,
  appointmentType: z.enum(['consultation', 'dental', 'medical_certificate', 'follow_up', 'emergency']),
  appointmentDate: dateSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  timeOfDay: z.enum(['AM', 'PM']),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().or(z.literal('')),
  patientName: nameSchema.optional(),
  patientEmail: emailSchema.optional(),
  patientPhone: phoneSchema,
  bookerRole: z.enum(['student', 'nurse', 'admin', 'supervisor']).default('student'),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

// ─── Email Template Validation ───────────────────────────────────────────────

export const emailTemplateSchema = z.object({
  campusId: uuidSchema,
  templateType: z.enum(['booking_confirmation', 'appointment_reminder', 'cancellation']),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters')
    .trim(),
  body: z.string()
    .min(1, 'Body is required')
    .max(10000, 'Body must be less than 10,000 characters')
    .trim(),
  isActive: z.boolean().default(true),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

// ─── Schedule Configuration Validation ───────────────────────────────────────

export const scheduleConfigSchema = z.object({
  campusId: uuidSchema,
  includeSaturday: z.boolean().default(false),
  includeSunday: z.boolean().default(false),
  holidayDates: z.array(dateSchema).default([]),
});

export type ScheduleConfigInput = z.infer<typeof scheduleConfigSchema>;

// ─── Booking Settings Validation ─────────────────────────────────────────────

export const bookingSettingsSchema = z.object({
  campusId: uuidSchema,
  maxBookingsPerDay: z.number()
    .int('Must be a whole number')
    .min(1, 'Must allow at least 1 booking per day')
    .max(500, 'Cannot exceed 500 bookings per day'),
  allowWalkIns: z.boolean().default(true),
  requireApproval: z.boolean().default(false),
});

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

// ─── Day Override Validation ─────────────────────────────────────────────────

export const dayOverrideSchema = z.object({
  campusId: uuidSchema,
  overrideDate: dateSchema,
  isClosed: z.boolean().default(false),
  maxBookings: z.number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(500, 'Cannot exceed 500 bookings')
    .optional(),
  reason: z.string().max(200, 'Reason must be less than 200 characters').optional().or(z.literal('')),
});

export type DayOverrideInput = z.infer<typeof dayOverrideSchema>;

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Validates input against a Zod schema and returns either the parsed data or validation errors
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      (error as z.ZodError).issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: 'Validation failed' } };
  }
}

/**
 * Sanitizes HTML input by removing potentially dangerous tags and attributes
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Sanitizes a string for SQL LIKE queries by escaping special characters
 */
export function sanitizeLikeQuery(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&');
}
