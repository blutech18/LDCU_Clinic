import { useEffect, useState } from 'react';
import { CalendarDays, Save, Check, Plus, Trash2 } from 'lucide-react';
import { useScheduleStore } from '~/modules/schedule';

// Toggle switch component
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex items-center gap-3 cursor-pointer group"
        >
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-maroon-800' : 'bg-gray-300'}`}>
                <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
                />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 select-none">{label}</span>
        </button>
    );
}

export function AdminScheduleConfigPage() {
    const { campuses, fetchCampuses, scheduleConfig, fetchScheduleConfig, updateScheduleConfig } = useScheduleStore();
    const [selectedCampus, setSelectedCampus] = useState('');
    const [includeSaturday, setIncludeSaturday] = useState(false);
    const [includeSunday, setIncludeSunday] = useState(false);
    // Keep full YYYY-MM-DD dates to stay compatible with syncPhHolidays and the rest of the app
    const [holidayDates, setHolidayDates] = useState<string[]>([]);
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

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
            fetchScheduleConfig(selectedCampus);
        }
    }, [selectedCampus, fetchScheduleConfig]);

    useEffect(() => {
        if (scheduleConfig === undefined) return;
        setIncludeSaturday(scheduleConfig?.include_saturday ?? false);
        setIncludeSunday(scheduleConfig?.include_sunday ?? false);
        // Deduplicate on load
        const raw: string[] = scheduleConfig?.holiday_dates || [];
        setHolidayDates(Array.from(new Set(raw)).sort());
    }, [scheduleConfig]);

    const handleSave = async () => {
        if (!selectedCampus) return;
        setSaving(true);
        setSaveError(null);
        try {
            await updateScheduleConfig(selectedCampus, {
                include_saturday: includeSaturday,
                include_sunday: includeSunday,
                holiday_dates: holidayDates,
            });
            // Re-fetch from DB to confirm the save actually persisted
            await fetchScheduleConfig(selectedCampus);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error: any) {
            console.error('Failed to save schedule config:', error);
            setSaveError(error?.message || 'Failed to save. Check console for details.');
        } finally {
            setSaving(false);
        }
    };

    const addHolidayDate = () => {
        if (!newHolidayDate || holidayDates.includes(newHolidayDate)) return;
        setHolidayDates([...holidayDates, newHolidayDate].sort());
        setNewHolidayDate('');
    };

    const removeHolidayDate = (date: string) => {
        setHolidayDates(holidayDates.filter((d) => d !== date));
    };

    // Display as "Month Day" without year
    const formatDisplay = (dateStr: string) => {
        // Handle both YYYY-MM-DD and MM-DD formats
        const full = dateStr.length === 5 ? `2000-${dateStr}` : dateStr;
        return new Date(full + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Schedule Config</h1>
                <p className="text-gray-600">Configure available days and holidays per campus</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-maroon-800" />
                    Schedule Configuration
                </h2>
                <p className="text-sm text-gray-600 mb-6">Configure which days are available for appointments and set holiday dates.</p>

                {/* Campus Selector */}
                <div className="mb-6">
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

                {/* Day Toggles */}
                <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-1">Available Days</h3>
                    <p className="text-sm text-gray-500 mb-4">Monday to Friday are always enabled. Toggle Saturday and Sunday below.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Toggle
                            checked={includeSaturday}
                            onChange={setIncludeSaturday}
                            label="Include Saturday"
                        />
                        <Toggle
                            checked={includeSunday}
                            onChange={setIncludeSunday}
                            label="Include Sunday"
                        />
                    </div>
                    {/* Visual day pills */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
                            <span key={d} className="px-3 py-1 text-xs font-semibold rounded-full bg-maroon-100 text-maroon-800 border border-maroon-200">{d}</span>
                        ))}
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${includeSaturday ? 'bg-maroon-100 text-maroon-800 border-maroon-200' : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>Sat</span>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${includeSunday ? 'bg-maroon-100 text-maroon-800 border-maroon-200' : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>Sun</span>
                    </div>
                </div>

                {/* Holiday Dates */}
                <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-1">Holiday Dates</h3>
                    <p className="text-sm text-gray-500 mb-4">Add dates when the clinic is closed. No appointments will be scheduled on these dates.</p>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="date"
                            value={newHolidayDate}
                            onChange={(e) => setNewHolidayDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
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
                            {holidayDates.map((hd, idx) => (
                                <div key={`${hd}-${idx}`} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                                    <span>{formatDisplay(hd)}</span>
                                    <button
                                        onClick={() => removeHolidayDate(hd)}
                                        className="ml-1 hover:text-red-900 transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
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
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        {saved && (
                            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                Configuration saved!
                            </span>
                        )}
                    </div>
                    {saveError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            ⚠️ {saveError}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
