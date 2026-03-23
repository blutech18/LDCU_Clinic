import { Header, Footer } from '~/components/layout';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-maroon-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-900 px-6 sm:px-10 py-8 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">Privacy Policy</h1>
              </div>
              <p className="text-maroon-200 text-sm">
                Liceo de Cagayan University — University Clinic
              </p>
              <p className="text-maroon-300 text-xs mt-1">
                Last updated: March 2026
              </p>
            </div>

            {/* Content */}
            <div className="px-6 sm:px-10 py-8 space-y-8 text-gray-700 text-sm leading-relaxed">

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">1. Introduction</h2>
                <p>
                  This Privacy Policy describes how Liceo de Cagayan University ("LDCU", "we", "us") collects,
                  uses, stores, and protects your personal information through the LDCU University Clinic
                  Appointment System (the "System"), in compliance with <strong>Republic Act No. 10173</strong>,
                  also known as the <strong>Data Privacy Act of 2012</strong>, and its Implementing Rules and Regulations.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">2. Information We Collect</h2>
                <p className="mb-3">When you use the System, we may collect the following personal information:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Identity Data:</strong> Full name, student/employee ID, date of birth, sex</li>
                  <li><strong>Contact Data:</strong> Email address, contact number</li>
                  <li><strong>Academic/Employment Data:</strong> Campus, department/college, role (student/staff)</li>
                  <li><strong>Appointment Data:</strong> Appointment dates, types (consultation, physical exam, dental), appointment status</li>
                  <li><strong>Technical Data:</strong> Browser type (user agent), login timestamps, and activity logs for security audit purposes</li>
                  <li><strong>Authentication Data:</strong> Google account information (if using Google Sign-In), session tokens</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
                <p className="mb-3">Your personal information is processed for the following lawful purposes:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Scheduling and managing clinic appointments</li>
                  <li>Sending appointment confirmations and reminders via email</li>
                  <li>Verifying your identity and role within the university</li>
                  <li>Maintaining audit logs for security and accountability</li>
                  <li>Generating anonymized, aggregate clinic statistics for university reporting</li>
                  <li>Improving System functionality and user experience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">4. Legal Basis for Processing</h2>
                <p>
                  We process your personal data based on: (a) your <strong>consent</strong> when creating an account or booking appointments;
                  (b) <strong>contractual necessity</strong> — the provision of university clinic services;
                  and (c) <strong>legitimate interests</strong> — maintaining campus health services, security, and regulatory compliance.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">5. Data Sharing</h2>
                <p className="mb-3">We do <strong>not</strong> sell, trade, or rent your personal data. Your information may be shared only with:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Authorized clinic staff</strong> — nurses and supervisors who manage appointments at your campus</li>
                  <li><strong>University administration</strong> — HR department for staff role verification</li>
                  <li><strong>Email service provider</strong> — Resend (for sending appointment notifications); only your email address and appointment details are shared</li>
                  <li><strong>Hosting provider</strong> — Supabase (database) and Vercel (web hosting); data is secured under their own privacy policies</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">6. Data Security</h2>
                <p>
                  We implement industry-standard security measures including: encrypted connections (HTTPS/TLS),
                  Row Level Security (RLS) policies for database access control, role-based access restrictions,
                  audit logging of all system actions, and idle session timeouts. Despite these measures, no system
                  is perfectly secure, and we cannot guarantee absolute data security.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">7. Data Retention</h2>
                <p>
                  Appointment records are retained for the duration of your enrollment or employment at LDCU,
                  plus an additional period as required by university records management policies. Audit logs are retained for a
                  minimum of one (1) academic year. You may request deletion of your personal data at any time (see Section 8).
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">8. Your Rights</h2>
                <p className="mb-3">Under the Data Privacy Act of 2012, you have the right to:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Be informed</strong> — know how your data is being processed</li>
                  <li><strong>Access</strong> — request a copy of your personal data</li>
                  <li><strong>Correct</strong> — update or correct inaccurate data</li>
                  <li><strong>Erase</strong> — request deletion of your data under certain conditions</li>
                  <li><strong>Object</strong> — object to data processing in certain cases</li>
                  <li><strong>Data portability</strong> — receive your data in a structured, machine-readable format</li>
                  <li><strong>File a complaint</strong> — lodge a complaint with the National Privacy Commission (NPC)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">9. Contact Us</h2>
                <p>
                  For questions, concerns, or requests regarding your personal data, please contact:
                </p>
                <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="font-semibold text-gray-900">LDCU University Clinic</p>
                  <p>Rodolfo N. Pelaez Blvd, Cagayan de Oro, 9000 Misamis Oriental</p>
                  <p className="mt-2">
                    You may also contact the <strong>National Privacy Commission</strong> at{' '}
                    <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-maroon-800 underline hover:text-maroon-600">
                      privacy.gov.ph
                    </a>{' '}
                    for any privacy-related concerns.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. Any changes will be reflected on this page
                  with an updated revision date. Continued use of the System after changes constitutes acceptance
                  of the updated policy.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
