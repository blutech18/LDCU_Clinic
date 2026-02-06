import { supabase } from './supabase';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

/**
 * Send an email using Supabase Edge Function.
 * Falls back to storing in a `pending_emails` table if the edge function is not available.
 */
export async function sendEmail({ to, subject, body }: SendEmailParams): Promise<boolean> {
  try {
    // Try calling the Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html: body },
    });

    if (error) {
      console.warn('Edge function not available, queuing email:', error.message);
      // Fallback: store in pending_emails table for later processing
      await queueEmail({ to, subject, body });
      return true;
    }

    return !!data;
  } catch (error) {
    console.warn('Email sending failed, queuing:', error);
    await queueEmail({ to, subject, body });
    return true;
  }
}

/**
 * Queue an email in the database for later sending
 */
async function queueEmail({ to, subject, body }: SendEmailParams) {
  try {
    const { error } = await supabase
      .from('pending_emails')
      .insert({
        to_email: to,
        subject,
        body,
        status: 'pending',
      });

    if (error) {
      console.error('Failed to queue email:', error);
    }
  } catch (err) {
    console.error('Failed to queue email:', err);
  }
}

/**
 * Send booking confirmation email to a patient
 */
export async function sendBookingConfirmation(
  patientEmail: string,
  patientName: string,
  appointmentDate: string,
  appointmentType: string,
  customTemplate?: { subject: string; body: string }
) {
  const defaultSubject = 'Appointment Booking Confirmation - LDCU Clinic';
  const defaultBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #800000; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">LDCU University Clinic</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">Appointment Confirmation</p>
      </div>
      <div style="background-color: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #374151;">Your appointment has been successfully booked!</p>
        <div style="background-color: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="margin: 4px 0; color: #6b7280;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 4px 0; color: #6b7280;"><strong>Type:</strong> ${appointmentType}</p>
          <p style="margin: 4px 0; color: #6b7280;"><strong>Service:</strong> First come, first served</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Please arrive on time. If you need to cancel, please do so at least 24 hours in advance.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Thank you,<br><strong>LDCU University Clinic</strong></p>
      </div>
    </div>
  `;

  const subject = customTemplate?.subject
    ? customTemplate.subject
        .replace('{{name}}', patientName)
        .replace('{{date}}', appointmentDate)
        .replace('{{type}}', appointmentType)
    : defaultSubject;

  const body = customTemplate?.body
    ? customTemplate.body
        .replace(/\{\{name\}\}/g, patientName)
        .replace(/\{\{date\}\}/g, appointmentDate)
        .replace(/\{\{type\}\}/g, appointmentType)
    : defaultBody;

  return sendEmail({ to: patientEmail, subject, body });
}

/**
 * Send appointment reminder email to a patient
 */
export async function sendAppointmentReminder(
  patientEmail: string,
  patientName: string,
  appointmentDate: string,
  appointmentType: string,
  customTemplate?: { subject: string; body: string }
) {
  const defaultSubject = 'Appointment Reminder - LDCU Clinic';
  const defaultBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #800000; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">LDCU University Clinic</h1>
        <p style="margin: 5px 0 0; opacity: 0.9;">Appointment Reminder</p>
      </div>
      <div style="background-color: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 16px;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #374151;">This is a friendly reminder about your upcoming appointment.</p>
        <div style="background-color: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="margin: 4px 0; color: #6b7280;"><strong>Date:</strong> ${appointmentDate}</p>
          <p style="margin: 4px 0; color: #6b7280;"><strong>Type:</strong> ${appointmentType}</p>
          <p style="margin: 4px 0; color: #6b7280;"><strong>Service:</strong> First come, first served</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Please arrive on time for your appointment. If you need to reschedule, please contact the clinic.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Thank you,<br><strong>LDCU University Clinic</strong></p>
      </div>
    </div>
  `;

  const subject = customTemplate?.subject
    ? customTemplate.subject
        .replace('{{name}}', patientName)
        .replace('{{date}}', appointmentDate)
        .replace('{{type}}', appointmentType)
    : defaultSubject;

  const body = customTemplate?.body
    ? customTemplate.body
        .replace(/\{\{name\}\}/g, patientName)
        .replace(/\{\{date\}\}/g, appointmentDate)
        .replace(/\{\{type\}\}/g, appointmentType)
    : defaultBody;

  return sendEmail({ to: patientEmail, subject, body });
}
