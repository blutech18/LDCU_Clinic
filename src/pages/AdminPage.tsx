import { useEffect, useState } from 'react';
import { Users, Check, X, Search, Settings, Save, Mail, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { useScheduleStore } from '~/modules/schedule';
import { useAdminStore } from '~/modules/admin';

export function AdminPage() {
    const { users, isLoadingUsers: isLoading, fetchUsers, verifyUser, changeRole } = useAdminStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');
    const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'templates' | 'schedule'>('users');
    const [maxBookings, setMaxBookings] = useState<number>(50);
    const [selectedSettingsCampus, setSelectedSettingsCampus] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    const { campuses, fetchCampuses, fetchBookingSetting, bookingSetting, updateBookingSetting, emailTemplates, fetchEmailTemplates, upsertEmailTemplate, scheduleConfig, fetchScheduleConfig, updateScheduleConfig } = useScheduleStore();

    const [includeSaturday, setIncludeSaturday] = useState(false);
    const [includeSunday, setIncludeSunday] = useState(false);
    const [holidayDates, setHolidayDates] = useState<string[]>([]);
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [savingScheduleConfig, setSavingScheduleConfig] = useState(false);
    const [scheduleConfigSaved, setScheduleConfigSaved] = useState(false);

    const [confirmSubject, setConfirmSubject] = useState('Appointment Booking Confirmation - LDCU Clinic');
    const [confirmBody, setConfirmBody] = useState('Dear {{name}},\n\nYour appointment has been successfully booked!\n\nDate: {{date}}\nType: {{type}}\nService: First come, first served\n\nPlease arrive on time. If you need to cancel, please do so at least 24 hours in advance.\n\nThank you,\nLDCU University Clinic');
    const [reminderSubject, setReminderSubject] = useState('Appointment Reminder - LDCU Clinic');
    const [reminderBody, setReminderBody] = useState('Dear {{name}},\n\nThis is a friendly reminder about your upcoming appointment.\n\nDate: {{date}}\nType: {{type}}\nService: First come, first served\n\nPlease arrive on time for your appointment.\n\nThank you,\nLDCU University Clinic');
    const [savingTemplates, setSavingTemplates] = useState(false);
    const [templatesSaved, setTemplatesSaved] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchCampuses();
    }, [fetchUsers, fetchCampuses]);

    useEffect(() => {
        if (campuses.length > 0 && !selectedSettingsCampus) {
            setSelectedSettingsCampus(campuses[0].id);
        }
    }, [campuses, selectedSettingsCampus]);

    useEffect(() => {
        if (selectedSettingsCampus) {
            fetchBookingSetting(selectedSettingsCampus);
            fetchEmailTemplates(selectedSettingsCampus);
            fetchScheduleConfig(selectedSettingsCampus);
        }
    }, [selectedSettingsCampus, fetchBookingSetting, fetchEmailTemplates, fetchScheduleConfig]);

    useEffect(() => {
        setIncludeSaturday(scheduleConfig?.include_saturday || false);
        setIncludeSunday(scheduleConfig?.include_sunday || false);
        setHolidayDates(scheduleConfig?.holiday_dates || []);
    }, [scheduleConfig]);

    const handleSaveScheduleConfig = async () => {
        if (!selectedSettingsCampus) return;
        setSavingScheduleConfig(true);
        try {
            await updateScheduleConfig(selectedSettingsCampus, {
                include_saturday: includeSaturday,
                include_sunday: includeSunday,
                holiday_dates: holidayDates,
            });
            setScheduleConfigSaved(true);
            setTimeout(() => setScheduleConfigSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save schedule config:', error);
        } finally {
            setSavingScheduleConfig(false);
        }
    };

    const addHolidayDate = () => {
        if (newHolidayDate && !holidayDates.includes(newHolidayDate)) {
            setHolidayDates([...holidayDates, newHolidayDate].sort());
            setNewHolidayDate('');
        }
    };

    const removeHolidayDate = (dateToRemove: string) => {
        setHolidayDates(holidayDates.filter(d => d !== dateToRemove));
    };

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
    }, [emailTemplates]);

    const handleSaveTemplates = async () => {
        if (!selectedSettingsCampus) return;
        setSavingTemplates(true);
        try {
            await upsertEmailTemplate({
                campus_id: selectedSettingsCampus,
                template_type: 'booking_confirmation',
                subject: confirmSubject,
                body: confirmBody,
            });
            await upsertEmailTemplate({
                campus_id: selectedSettingsCampus,
                template_type: 'appointment_reminder',
                subject: reminderSubject,
                body: reminderBody,
            });
            setTemplatesSaved(true);
            setTimeout(() => setTemplatesSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save templates:', error);
        } finally {
            setSavingTemplates(false);
        }
    };

    useEffect(() => {
        setMaxBookings(bookingSetting?.max_bookings_per_day || 50);
    }, [bookingSetting]);

    const handleSaveBookingSettings = async () => {
        if (!selectedSettingsCampus) return;
        setSavingSettings(true);
        try {
            await updateBookingSetting(selectedSettingsCampus, maxBookings);
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save booking settings:', error);
        } finally {
            setSavingSettings(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            !searchTerm ||
            user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
            filter === 'all' ||
            (filter === 'pending' && !user.is_verified) ||
            (filter === 'verified' && user.is_verified);

        return matchesSearch && matchesFilter;
    });

    const pendingCount = users.filter((u) => !u.is_verified).length;

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                    <p className="text-gray-600">Manage users and system settings</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                            <Users className="w-4 h-4" />
                            {pendingCount} pending verification
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                        activeTab === 'users' ? 'bg-maroon-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                        activeTab === 'settings' ? 'bg-maroon-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <Settings className="w-4 h-4" />
                    Booking Settings
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                        activeTab === 'templates' ? 'bg-maroon-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <Mail className="w-4 h-4" />
                    Email Templates
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                        activeTab === 'schedule' ? 'bg-maroon-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <CalendarDays className="w-4 h-4" />
                    Schedule Config
                </button>
            </div>

            {activeTab === 'settings' && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-maroon-800" />
                        Booking Limit Settings
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">Set the maximum number of appointments that can be booked per day for each campus.</p>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                            <select
                                value={selectedSettingsCampus}
                                onChange={(e) => setSelectedSettingsCampus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                            >
                                {campuses.map((campus) => (
                                    <option key={campus.id} value={campus.id}>
                                        {campus.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Bookings Per Day</label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={maxBookings}
                                onChange={(e) => setMaxBookings(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                        <button
                            onClick={handleSaveBookingSettings}
                            disabled={savingSettings}
                            className="px-6 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {savingSettings ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {savingSettings ? 'Saving...' : 'Save Settings'}
                        </button>
                        {settingsSaved && (
                            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Settings saved successfully!
                            </span>
                        )}
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">
                            Current setting: <span className="font-medium text-gray-700">{bookingSetting?.max_bookings_per_day || 50}</span> bookings per day
                            {bookingSetting ? '' : ' (default)'}
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'schedule' && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-maroon-800" />
                        Schedule Configuration
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">Configure which days are available for appointments and set holiday dates.</p>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                        <select
                            value={selectedSettingsCampus}
                            onChange={(e) => setSelectedSettingsCampus(e.target.value)}
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                        >
                            {campuses.map((campus) => (
                                <option key={campus.id} value={campus.id}>
                                    {campus.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Day Toggles */}
                    <div className="border rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-gray-900 mb-3">Available Days</h3>
                        <p className="text-sm text-gray-500 mb-4">Monday to Friday are always enabled. Toggle Saturday and Sunday below.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={includeSaturday}
                                        onChange={(e) => setIncludeSaturday(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-11 h-6 rounded-full transition-colors ${
                                        includeSaturday ? 'bg-maroon-800' : 'bg-gray-300'
                                    }`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                                            includeSaturday ? 'translate-x-[22px]' : 'translate-x-0.5'
                                        }`} />
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-gray-700">Include Saturday</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={includeSunday}
                                        onChange={(e) => setIncludeSunday(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-11 h-6 rounded-full transition-colors ${
                                        includeSunday ? 'bg-maroon-800' : 'bg-gray-300'
                                    }`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                                            includeSunday ? 'translate-x-[22px]' : 'translate-x-0.5'
                                        }`} />
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-gray-700">Include Sunday</span>
                            </label>
                        </div>
                    </div>

                    {/* Holiday Dates */}
                    <div className="border rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-gray-900 mb-3">Holiday Dates</h3>
                        <p className="text-sm text-gray-500 mb-4">Add dates when the clinic is closed. No appointments will be scheduled on these dates.</p>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="date"
                                value={newHolidayDate}
                                onChange={(e) => setNewHolidayDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                            />
                            <button
                                onClick={addHolidayDate}
                                disabled={!newHolidayDate}
                                className="px-3 py-2 bg-maroon-800 text-white rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-1 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                        {holidayDates.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No holiday dates set</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {holidayDates.map((hd) => (
                                    <div key={hd} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                                        <span>{new Date(hd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <button onClick={() => removeHolidayDate(hd)} className="ml-1 hover:text-red-900 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveScheduleConfig}
                            disabled={savingScheduleConfig}
                            className="px-6 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {savingScheduleConfig ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {savingScheduleConfig ? 'Saving...' : 'Save Configuration'}
                        </button>
                        {scheduleConfigSaved && (
                            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Configuration saved!
                            </span>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-maroon-800" />
                        Email Templates
                    </h2>
                    <p className="text-sm text-gray-600 mb-2">Customize the email templates sent to patients. Use placeholders: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{type}}'}</code></p>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                        <select
                            value={selectedSettingsCampus}
                            onChange={(e) => setSelectedSettingsCampus(e.target.value)}
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
                                    value={confirmBody}
                                    onChange={(e) => setConfirmBody(e.target.value)}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none font-mono text-sm"
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
                                    value={reminderBody}
                                    onChange={(e) => setReminderBody(e.target.value)}
                                    rows={6}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none font-mono text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveTemplates}
                            disabled={savingTemplates}
                            className="px-6 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {savingTemplates ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {savingTemplates ? 'Saving...' : 'Save Templates'}
                        </button>
                        {templatesSaved && (
                            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Templates saved successfully!
                            </span>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
            <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'pending', 'verified'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-colors ${filter === f
                                        ? 'bg-maroon-800 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center">
                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-600">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-maroon-100 rounded-full flex items-center justify-center">
                                                    <span className="text-maroon-800 font-medium">
                                                        {user.first_name?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 capitalize">{user.user_type || user.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-gray-600">{user.email}</td>
                                        <td className="px-4 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => changeRole(user.id, e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                            >
                                                <option value="employee">Employee</option>
                                                <option value="student">Student</option>
                                                <option value="staff">Staff</option>
                                                <option value="nurse">Nurse</option>
                                                <option value="doctor">Doctor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded ${user.is_verified
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {user.is_verified ? 'Verified' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {!user.is_verified ? (
                                                <button
                                                    onClick={() => verifyUser(user.id, true)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Verify
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => verifyUser(user.id, false)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Revoke
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            </>
            )}
        </>
    );
}
