import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is staff
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "doctor", "nurse", "employee", "staff", "student"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Staff only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, subject, html, targetDate, campusId, customTemplate } = body;

    // Mode 1: Send a single email (used by booking confirmation)
    if (to && subject && html) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "LDCU Clinic <noreply@citattendance.info>",
          to,
          subject,
          html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send email");
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Send bulk reminders for a date (used by Send Reminders button)
    if (targetDate && campusId) {
      let dateStr: string;
      const today = new Date();

      if (targetDate === "today") {
        dateStr = today.toISOString().split("T")[0];
      } else if (targetDate === "tomorrow") {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateStr = tomorrow.toISOString().split("T")[0];
      } else {
        dateStr = targetDate;
      }

      // Fetch scheduled appointments for the date
      const { data: appointments, error: fetchError } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, end_time, appointment_type, patient_name, patient_email, status")
        .eq("appointment_date", dateStr)
        .eq("campus_id", campusId)
        .eq("status", "scheduled");

      if (fetchError) {
        return new Response(JSON.stringify({ error: fetchError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!appointments || appointments.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No scheduled appointments found", sent: 0, skipped: 0, failed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const withEmail = appointments.filter((a: any) => a.patient_email?.includes("@"));
      const skipped = appointments.length - withEmail.length;
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const appt of withEmail) {
        try {
          const formattedDate = new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          const appointmentTypeLabel = appt.appointment_type === "physical_exam"
            ? "Physical Examination"
            : appt.appointment_type === "dental"
            ? "Dental"
            : "Consultation";

          // Build email subject and HTML
          let emailSubject: string;
          let emailHtml: string;

          if (customTemplate?.subject && customTemplate?.body) {
            // Use custom template with placeholder replacement
            emailSubject = customTemplate.subject
              .replace(/\{\{name\}\}/g, appt.patient_name || "Valued Patient")
              .replace(/\{\{date\}\}/g, formattedDate)
              .replace(/\{\{type\}\}/g, appointmentTypeLabel);

            const customBodyHtml = customTemplate.body
              .replace(/\{\{name\}\}/g, appt.patient_name || "Valued Patient")
              .replace(/\{\{date\}\}/g, formattedDate)
              .replace(/\{\{type\}\}/g, appointmentTypeLabel)
              .replace(/\n/g, "<br>");

            emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#7B1113 0%,#5a0d0e 100%);padding:30px 40px;text-align:center;">
<h1 style="color:#FFD700;margin:0;font-size:28px;font-weight:bold;">LICEO DE CAGAYAN UNIVERSITY</h1>
<p style="color:#ffffff;margin:8px 0 0 0;font-size:16px;letter-spacing:1px;">University Clinic</p>
</td></tr>
<tr><td style="background-color:#FFD700;height:4px;"></td></tr>
<tr><td style="padding:40px;">
<p style="color:#333;font-size:15px;line-height:1.8;">${customBodyHtml}</p>
</td></tr>
<tr><td style="background-color:#7B1113;padding:25px 40px;text-align:center;">
<p style="color:#FFD700;font-size:14px;font-weight:bold;margin:0 0 5px 0;">LDCU University Clinic</p>
<p style="color:#fff;font-size:12px;margin:0 0 10px 0;">Liceo de Cagayan University, Cagayan de Oro City</p>
<p style="color:rgba(255,255,255,0.7);font-size:11px;margin:0;">This is an automated message. Please do not reply.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
          } else {
            // Default template
            emailSubject = `Appointment Reminder - ${formattedDate} | LDCU Clinic`;
            emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#7B1113 0%,#5a0d0e 100%);padding:30px 40px;text-align:center;">
<h1 style="color:#FFD700;margin:0;font-size:28px;font-weight:bold;">LICEO DE CAGAYAN UNIVERSITY</h1>
<p style="color:#ffffff;margin:8px 0 0 0;font-size:16px;letter-spacing:1px;">University Clinic</p>
</td></tr>
<tr><td style="background-color:#FFD700;height:4px;"></td></tr>
<tr><td style="padding:40px;">
<h2 style="color:#7B1113;margin:0 0 20px 0;font-size:24px;">Appointment Reminder</h2>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hello <strong>${appt.patient_name || "Valued Patient"}</strong>,</p>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 25px 0;">This is a friendly reminder about your upcoming appointment at the LDCU University Clinic:</p>
<table role="presentation" style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#fdf6f6 0%,#fff9e6 100%);border-radius:10px;border:1px solid #e8d4d4;margin-bottom:25px;">
<tr><td style="padding:25px;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td style="padding:10px 0;border-bottom:1px solid #e8d4d4;">
<span style="color:#7B1113;font-weight:bold;font-size:14px;">DATE</span><br>
<span style="color:#333;font-size:18px;font-weight:600;">${formattedDate}</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #e8d4d4;">
<span style="color:#7B1113;font-weight:bold;font-size:14px;">TYPE</span><br>
<span style="color:#333;font-size:18px;font-weight:600;">${appointmentTypeLabel}</span>
</td></tr>
<tr><td style="padding:10px 0;">
<span style="color:#7B1113;font-weight:bold;font-size:14px;">SERVICE</span><br>
<span style="color:#333;font-size:18px;font-weight:600;">First come, first served</span>
</td></tr>
</table></td></tr></table>
<table role="presentation" style="width:100%;border-collapse:collapse;background-color:#fff8e1;border-radius:8px;border-left:4px solid #FFD700;margin-bottom:25px;">
<tr><td style="padding:15px 20px;">
<p style="color:#7B1113;font-weight:bold;margin:0 0 8px 0;font-size:14px;">Important Reminders:</p>
<ul style="color:#555;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
<li>Please arrive <strong>10-15 minutes</strong> before your scheduled time</li>
<li>Bring a valid ID and any relevant medical documents</li>
<li>If you need to reschedule, please contact us as soon as possible</li>
</ul></td></tr></table>
</td></tr>
<tr><td style="background-color:#7B1113;padding:25px 40px;text-align:center;">
<p style="color:#FFD700;font-size:14px;font-weight:bold;margin:0 0 5px 0;">LDCU University Clinic</p>
<p style="color:#fff;font-size:12px;margin:0 0 10px 0;">Liceo de Cagayan University, Cagayan de Oro City</p>
<p style="color:rgba(255,255,255,0.7);font-size:11px;margin:0;">This is an automated message. Please do not reply.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
          }

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "LDCU Clinic <noreply@citattendance.info>",
              to: appt.patient_email,
              subject: emailSubject,
              html: emailHtml,
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Send failed");
          }
          sent++;
        } catch (emailError: any) {
          failed++;
          errors.push(`${appt.patient_email}: ${emailError.message}`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Sent ${sent} reminder(s) for ${dateStr}`,
        sent, skipped, failed,
        errors: errors.length > 0 ? errors : undefined,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
