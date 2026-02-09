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
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <!-- Header -->
        <div style="background-color: #800000; padding: 30px 20px; text-align: center;">
             <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">LDCU University Clinic</h1>
             <p style="margin: 5px 0 0; color: #fbbf24; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Appointment Confirmation</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; text-align: left;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px; font-weight: 600;">Hello, ${patientName}</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            We are pleased to confirm your appointment with LDCU Service Clinic. Your booking details are as follows:
          </p>
          
          <div style="background-color: #f9fafb; border-left: 4px solid #800000; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">
              <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Date</span>
              <span style="display: block; color: #111827; font-size: 16px; font-weight: 500;">${appointmentDate}</span>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Type</span>
              <span style="display: block; color: #111827; font-size: 16px; font-weight: 500;">${appointmentType}</span>
            </div>
            <div>
              <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Service</span>
              <span style="display: block; color: #111827; font-size: 16px; font-weight: 500;">First come, first served</span>
            </div>
          </div>
          
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            Please arrive at least 10 minutes before your scheduled time. If you need to cancel or reschedule, please do so at least 24 hours in advance.
          </p>

          <div style="margin-top: 30px; text-align: center;">
            <a href="https://ldcu-clinic.vercel.app/" style="display: inline-block; background-color: #800000; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">View Appointment</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #fbfbfc; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Liceo de Cagayan University Clinic. All rights reserved.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0;">
            Rodolfo N. Pelaez Blvd, Cagayan de Oro, 9000 Misamis Oriental
          </p>
        </div>
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
 * Send bulk reminders for all scheduled appointments on a given date.
 * Calls the edge function in bulk mode — emails sent server-side via Resend.
 */
export async function sendBulkReminders(
  targetDate: string,
  campusId: string,
  customTemplate?: { subject: string; body: string }
): Promise<{ success: boolean; sent: number; skipped: number; failed: number; message: string; errors?: string[] }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { targetDate, campusId, customTemplate },
    });

    if (error) {
      throw new Error(error.message || 'Failed to invoke send-email function');
    }

    return data;
  } catch (error: any) {
    console.error('Error sending bulk reminders:', error);
    throw error;
  }
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
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <!-- Header -->
        <div style="background-color: #800000; padding: 30px 20px; text-align: center;">
             <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">LDCU University Clinic</h1>
             <p style="margin: 5px 0 0; color: #fbbf24; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Appointment Reminder</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; text-align: left;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px; font-weight: 600;">Hello, ${patientName}</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            This is a friendly reminder about your upcoming appointment with LDCU Service Clinic tomorrow.
          </p>
          
          <div style="background-color: #f9fafb; border-left: 4px solid #fbbf24; padding: 20px; border-radius: 4px; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">
              <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Date</span>
              <span style="display: block; color: #111827; font-size: 16px; font-weight: 500;">${appointmentDate}</span>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Type</span>
              <span style="display: block; color: #111827; font-size: 16px; font-weight: 500;">${appointmentType}</span>
            </div>
            <div>
              <span style="display: block; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Service</span>
              <span style="display: block; color: #111827; font-size: 16px; font-weight: 500;">First come, first served</span>
            </div>
          </div>
          
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            We look forward to seeing you. If you cannot make it, please contact us as soon as possible to reschedule.
          </p>

          <div style="margin-top: 30px; text-align: center;">
            <a href="https://ldcu-clinic.vercel.app/" style="display: inline-block; background-color: #800000; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Manage Appointment</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #fbfbfc; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Liceo de Cagayan University Clinic. All rights reserved.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0;">
            Rodolfo N. Pelaez Blvd, Cagayan de Oro, 9000 Misamis Oriental
          </p>
        </div>
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
