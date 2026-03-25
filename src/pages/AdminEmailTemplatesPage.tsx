import { useEffect, useRef, useState } from 'react';
import { Mail, Save, Check } from 'lucide-react';
import { useScheduleStore } from '~/modules/schedule';

function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}


export function AdminEmailTemplatesPage() {
    const { campuses, fetchCampuses, emailTemplates, fetchEmailTemplates, upsertEmailTemplate } = useScheduleStore();
    const [selectedCampus, setSelectedCampus] = useState('');
    const [confirmSubject, setConfirmSubject] = useState('Appointment Booking Confirmation - LDCU Clinic');
    const [confirmBody, setConfirmBody] = useState('Dear {{name}},\n\nYour appointment has been successfully booked!\n\nDate: {{date}}\nType: {{type}}\nService: First come, first served\n\nPlease arrive on time. If you need to cancel, please do so at least 24 hours in advance.\n\nThank you,\nLDCU University Clinic');
    const [reminderSubject, setReminderSubject] = useState('Appointment Reminder - LDCU Clinic');
    const [reminderBody, setReminderBody] = useState('Dear {{name}},\n\nThis is a friendly reminder about your upcoming appointment.\n\nDate: {{date}}\nType: {{type}}\nService: First come, first served\n\nPlease arrive on time for your appointment.\n\nThank you,\nLDCU University Clinic');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const confirmBodyRef = useRef<HTMLTextAreaElement>(null);
    const reminderBodyRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetchCampuses();
    }, [fetchCampuses]);

    useEffect(() => {
        if (campuses.length > 0 && !selectedCampus) {
            setSelectedCampus(campuses[0].id);
        }
    }, [campuses, selectedCampus]);

    useEffect(() => {
        if (selectedCampus) {
            fetchEmailTemplates(selectedCampus);
        }
    }, [selectedCampus, fetchEmailTemplates]);

    useEffect(() => {
        const confirmTpl = emailTemplates.find(t => t.template_type === 'booking_confirmation');
        const reminderTpl = emailTemplates.find(t => t.template_type === 'appointment_reminder');
        if (confirmTpl) {
            setConfirmSubject(confirmTpl.subject);
            setConfirmBody(confirmTpl.body);
        }
        if (reminderTpl) {
            setReminderSubject(reminderTpl.subject);
            setReminderBody(reminderTpl.body);
        }
        // Re-measure heights after content loads
        setTimeout(() => {
            autoResize(confirmBodyRef.current);
            autoResize(reminderBodyRef.current);
        }, 0);
    }, [emailTemplates]);

    const handleSave = async () => {
        if (!selectedCampus) return;
        setSaving(true);
        try {
            await upsertEmailTemplate({
                campus_id: selectedCampus,
                template_type: 'booking_confirmation',
                subject: confirmSubject,
                body: confirmBody,
            });
            await upsertEmailTemplate({
                campus_id: selectedCampus,
                template_type: 'appointment_reminder',
                subject: reminderSubject,
                body: reminderBody,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save templates:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
                <p className="text-gray-600">Customize email notifications sent to patients</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-maroon-800" />
                    Email Templates
                </h2>
                <p className="text-sm text-gray-600 mb-2">Customize the email templates sent to patients. Use placeholders: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{type}}'}</code></p>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                    <select
                        value={selectedCampus}
                        onChange={(e) => setSelectedCampus(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                    >
                        {campuses.map((campus) => (
                            <option key={campus.id} value={campus.id}>
                                {campus.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Booking Confirmation Template */}
                <div className="border rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Booking Confirmation Email</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input
                                type="text"
                                value={confirmSubject}
                                onChange={(e) => setConfirmSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                            <textarea
                                ref={confirmBodyRef}
                                value={confirmBody}
                                onChange={(e) => { setConfirmBody(e.target.value); autoResize(e.target); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none font-mono text-sm overflow-hidden"
                                style={{ minHeight: '120px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Appointment Reminder Template */}
                <div className="border rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-900 mb-3">Appointment Reminder Email</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input
                                type="text"
                                value={reminderSubject}
                                onChange={(e) => setReminderSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                            <textarea
                                ref={reminderBodyRef}
                                value={reminderBody}
                                onChange={(e) => { setReminderBody(e.target.value); autoResize(e.target); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none font-mono text-sm overflow-hidden"
                                style={{ minHeight: '120px' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Templates'}
                    </button>
                    {saved && (
                        <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Templates saved successfully!
                        </span>
                    )}
                </div>
            </div>
        </>
    );
}
