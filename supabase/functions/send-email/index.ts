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

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has valid role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["admin", "doctor", "nurse", "supervisor", "staff", "student"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid role" }), {
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
      const { data: appointments, error: fetchError } = await supabaseAdmin
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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    
    /* Normal/Light styles explicitly defined */
    .bg-main { background-color: #f5f5f5; }
    .bg-card { background-color: #ffffff; }
    .bg-maroon { background-color: #7B1113; }
    .text-gold { color: #FFD700; }
    .text-white { color: #ffffff; }
    .text-maroon { color: #7B1113; }
    .text-dark { color: #000000; }
    
    @media (prefers-color-scheme: dark) {
      body, .bg-main { background-color: #121212 !important; }
      .bg-card { background-color: #1e1e1e !important; }
      
      /* Hack for iOS Mail: Use CSS background-image to override auto-inverted background-color */
      .bg-maroon { 
        background-color: transparent !important; 
        background-image: linear-gradient(#000000, #000000) !important; 
      }
      
      .text-dark { color: #ffffff !important; }
      
      .text-gold {
        color: transparent !important;
        background-image: linear-gradient(#ffffff, #ffffff) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }
      
      .text-white {
        color: transparent !important;
        background-image: linear-gradient(#aaaaaa, #aaaaaa) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }
      
      /* Hack for iOS text color inversion */
      .text-maroon { 
        color: transparent !important; 
        background-image: linear-gradient(#ff9999, #ff9999) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }
      
      .info-box { background-color: transparent !important; background-image: linear-gradient(#2a2a2a, #2a2a2a) !important; border-color: #444444 !important; }
      .info-border { border-color: #444444 !important; }
      .reminder-box { background-color: transparent !important; background-image: linear-gradient(#332b00, #332b00) !important; border-left-color: #FFD700 !important; }
    }
  </style>
</head>
<body class="bg-main" style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table class="bg-main" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:20px 10px;">
<table class="bg-card" role="presentation" width="100%" style="max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
<tr><td class="bg-maroon" style="padding:25px 30px;text-align:center;background-color:#7B1113;">
<h1 class="text-gold" style="color:#FFD700;margin:0;font-size:22px;font-weight:bold;">LICEO DE CAGAYAN UNIVERSITY</h1>
<p class="text-white" style="color:#ffffff;margin:5px 0 0 0;font-size:14px;">University Clinic</p>
</td></tr>
<tr><td style="background-color:#FFD700;height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
<tr><td style="padding:30px;">
<p class="text-dark" style="color:#000000;font-size:15px;line-height:1.6;margin:0;">${customBodyHtml}</p>
</td></tr>
<tr><td class="bg-maroon" style="background-color:#7B1113;padding:20px 30px;text-align:center;">
<p class="text-gold" style="color:#FFD700;font-size:13px;font-weight:bold;margin:0 0 5px 0;">LDCU University Clinic</p>
<p class="text-white" style="color:#ffffff;font-size:11px;margin:0 0 10px 0;">Liceo de Cagayan University, Cagayan de Oro City</p>
<p style="color:rgba(255,255,255,0.7);font-size:10px;margin:0;">This is an automated message. Please do not reply.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
          } else {
            // Default template
            emailSubject = `Appointment Reminder - ${formattedDate} | LDCU Clinic`;
            emailHtml = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    
    /* Normal/Light styles explicitly defined */
    .bg-main { background-color: #f5f5f5; }
    .bg-card { background-color: #ffffff; }
    .bg-maroon { background-color: #7B1113; }
    .text-gold { color: #FFD700; }
    .text-white { color: #ffffff; }
    .text-maroon { color: #7B1113; }
    .text-dark { color: #000000; }
    
    @media (prefers-color-scheme: dark) {
      body, .bg-main { background-color: #121212 !important; }
      .bg-card { background-color: #1e1e1e !important; }
      
      /* Hack for iOS Mail: Use CSS background-image to override auto-inverted background-color */
      .bg-maroon { 
        background-color: transparent !important; 
        background-image: linear-gradient(#000000, #000000) !important; 
      }
      
      .text-dark { color: #ffffff !important; }
      
      .text-gold {
        color: transparent !important;
        background-image: linear-gradient(#ffffff, #ffffff) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }
      
      .text-white {
        color: transparent !important;
        background-image: linear-gradient(#aaaaaa, #aaaaaa) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }
      
      /* Hack for iOS text color inversion */
      .text-maroon { 
        color: transparent !important; 
        background-image: linear-gradient(#ff9999, #ff9999) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
      }
      
      .info-box { background-color: transparent !important; background-image: linear-gradient(#2a2a2a, #2a2a2a) !important; border-color: #444444 !important; }
      .info-border { border-color: #444444 !important; }
      .reminder-box { background-color: transparent !important; background-image: linear-gradient(#332b00, #332b00) !important; border-left-color: #FFD700 !important; }
    }
  </style>
</head>
<body class="bg-main" style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;">
<table class="bg-main" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
<tr><td align="center" style="padding:20px 10px;">
<table class="bg-card" role="presentation" width="100%" style="max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
<tr><td class="bg-maroon" style="padding:25px 30px;text-align:center;background-color:#7B1113;">
<h1 class="text-gold" style="color:#FFD700;margin:0;font-size:22px;font-weight:bold;">LICEO DE CAGAYAN UNIVERSITY</h1>
<p class="text-white" style="color:#ffffff;margin:5px 0 0 0;font-size:14px;">University Clinic</p>
</td></tr>
<tr><td style="background-color:#FFD700;height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
<tr><td style="padding:30px;">
<h2 class="text-maroon" style="color:#7B1113;margin:0 0 15px 0;font-size:20px;">Appointment Reminder</h2>
<p class="text-dark" style="color:#000000;font-size:15px;line-height:1.5;margin:0 0 15px 0;">Hello <strong>${appt.patient_name || "Valued Patient"}</strong>,</p>
<p class="text-dark" style="color:#000000;font-size:14px;line-height:1.5;margin:0 0 20px 0;">This is a friendly reminder about your upcoming appointment at the LDCU University Clinic:</p>

<table class="info-box" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fdf6f6;border:1px solid #e8d4d4;border-radius:6px;margin-bottom:20px;">
<tr>
  <td class="info-border" width="50%" valign="top" style="padding:15px;border-bottom:1px solid #e8d4d4;border-right:1px solid #e8d4d4;">
    <span class="text-maroon" style="color:#7B1113;font-weight:bold;font-size:11px;text-transform:uppercase;">Date</span><br>
    <span class="text-dark" style="color:#000000;font-size:15px;font-weight:600;display:block;margin-top:4px;">${formattedDate}</span>
  </td>
  <td class="info-border" width="50%" valign="top" style="padding:15px;border-bottom:1px solid #e8d4d4;">
    <span class="text-maroon" style="color:#7B1113;font-weight:bold;font-size:11px;text-transform:uppercase;">Type</span><br>
    <span class="text-dark" style="color:#000000;font-size:15px;font-weight:600;display:block;margin-top:4px;">${appointmentTypeLabel}</span>
  </td>
</tr>
<tr>
  <td class="info-border" colspan="2" valign="top" style="padding:15px;">
    <span class="text-maroon" style="color:#7B1113;font-weight:bold;font-size:11px;text-transform:uppercase;">Service</span><br>
    <span class="text-dark" style="color:#000000;font-size:15px;font-weight:600;display:block;margin-top:4px;">First come, first served</span>
  </td>
</tr>
</table>

<table class="reminder-box" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#fff8e1;border-left:4px solid #FFD700;border-radius:4px;margin-bottom:10px;">
<tr><td style="padding:15px;">
<p class="text-maroon" style="color:#7B1113;font-weight:bold;margin:0 0 8px 0;font-size:13px;">Important Reminders:</p>
<ul class="text-dark" style="color:#000000;font-size:13px;line-height:1.5;margin:0;padding-left:20px;">
<li style="margin-bottom:4px;">Please arrive <strong>10-15 minutes</strong> before your scheduled time</li>
<li style="margin-bottom:4px;">Bring a valid ID and any relevant medical documents</li>
<li>If you need to reschedule, please contact us as soon as possible</li>
</ul></td></tr></table>
</td></tr>
<tr><td class="bg-maroon" style="background-color:#7B1113;padding:20px 30px;text-align:center;">
<p class="text-gold" style="color:#FFD700;font-size:13px;font-weight:bold;margin:0 0 5px 0;">LDCU University Clinic</p>
<p class="text-white" style="color:#ffffff;font-size:11px;margin:0 0 10px 0;">Liceo de Cagayan University, Cagayan de Oro City</p>
<p style="color:rgba(255,255,255,0.7);font-size:10px;margin:0;">This is an automated message. Please do not reply.</p>
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
