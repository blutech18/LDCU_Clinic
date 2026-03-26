import { X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-900 text-white px-6 py-6 flex items-center justify-between border-b-4 border-maroon-950">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Privacy Policy</h2>
                <p className="text-maroon-100 text-sm">Last updated: March 2026</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-8 text-gray-700 text-sm leading-relaxed space-y-8">
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">1. Introduction</h3>
              <p>
                This Privacy Policy describes how Liceo de Cagayan University ("LDCU", "we", "us") collects,
                uses, stores, and protects your personal information through the LDCU University Clinic
                Appointment System (the "System"), in compliance with <strong>Republic Act No. 10173</strong>,
                also known as the <strong>Data Privacy Act of 2012</strong>, and its Implementing Rules and Regulations.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">2. Information We Collect</h3>
              <p className="mb-3">When you use the System, we may collect the following personal information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identity Data:</strong> Full name, student/employee ID, date of birth, sex</li>
                <li><strong>Contact Data:</strong> Email address, contact number</li>
                <li><strong>Academic/Employment Data:</strong> Campus, department/college, role (student/staff)</li>
                <li><strong>Appointment Data:</strong> Appointment dates, types (consultation, physical exam, dental), appointment status</li>
                <li><strong>Technical Data:</strong> Browser type (user agent), login timestamps, and activity logs for security audit purposes</li>
                <li><strong>Authentication Data:</strong> Google account information (if using Google Sign-In), session tokens</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">3. How We Use Your Information</h3>
              <p className="mb-3">Your personal information is processed for the following lawful purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Scheduling and managing clinic appointments</li>
                <li>Sending appointment confirmations and reminders via email</li>
                <li>Verifying your identity and role within the university</li>
                <li>Maintaining audit logs for security and accountability</li>
                <li>Generating anonymized, aggregate clinic statistics for university reporting</li>
                <li>Improving System functionality and user experience</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">4. Legal Basis for Processing</h3>
              <p>
                We process your personal data based on: (a) your <strong>consent</strong> when creating an account or booking appointments;
                (b) <strong>contractual necessity</strong> — the provision of university clinic services;
                and (c) <strong>legitimate interests</strong> — maintaining campus health services, security, and regulatory compliance.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">5. Data Sharing</h3>
              <p className="mb-3">We do <strong>not</strong> sell, trade, or rent your personal data. Your information may be shared only with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Authorized clinic staff</strong> — nurses and supervisors who manage appointments at your campus</li>
                <li><strong>University administration</strong> — HR department for staff role verification</li>
                <li><strong>Email service provider</strong> — Resend (for sending appointment notifications); only your email address and appointment details are shared</li>
                <li><strong>Hosting provider</strong> — Supabase (database) and Vercel (web hosting); data is secured under their own privacy policies</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">6. Data Security</h3>
              <p>
                We implement industry-standard security measures including: encrypted connections (HTTPS/TLS),
                Row Level Security (RLS) policies for database access control, role-based access restrictions,
                audit logging of all system actions, and idle session timeouts. Despite these measures, no system
                is perfectly secure, and we cannot guarantee absolute data security.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">7. Data Retention</h3>
              <p>
                Appointment records are retained for the duration of your enrollment or employment at LDCU,
                plus an additional period as required by university records management policies. Audit logs are retained for a
                minimum of one (1) academic year. You may request deletion of your personal data at any time (see Section 8).
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">8. Your Rights</h3>
              <p className="mb-3">Under the Data Privacy Act of 2012, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
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
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">9. Contact Us</h3>
              <p className="mb-4">
                For questions, concerns, or requests regarding your personal data, please contact:
              </p>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <p className="text-base font-bold text-gray-900 mb-1">LDCU University Clinic</p>
                <p className="text-gray-600 mb-3">Rodolfo N. Pelaez Blvd, Cagayan de Oro, 9000 Misamis Oriental</p>
                <p className="text-gray-700 pt-3 border-t border-gray-200">
                  You may also contact the <strong>National Privacy Commission</strong> at{' '}
                  <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-maroon-800 font-semibold hover:underline">
                    privacy.gov.ph
                  </a>{' '}
                  for any privacy-related concerns.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">10. Changes to This Policy</h3>
              <p>
                We may update this Privacy Policy from time to time. Any changes will be reflected on this page
                with an updated revision date. Continued use of the System after changes constitutes acceptance
                of the updated policy.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full bg-maroon-800 text-white py-3 px-6 rounded-xl font-semibold hover:bg-maroon-700 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
