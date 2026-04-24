import { useEffect, useState } from 'react';
import { CalendarDays, Save, Check, Plus, Trash2 } from 'lucide-react';
import { useScheduleStore } from '~/modules/schedule';
import { clampDateYear } from '~/lib/utils';
import { supabase } from '~/lib/supabase';

// Toggle switch component
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="w-full flex items-center gap-3 cursor-pointer group"
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
    // Per-day weekday toggle: disabled indices 0=Sun … 6=Sat (#4)
    const [disabledWeekdays, setDisabledWeekdays] = useState<number[]>([]);
    // Keep full YYYY-MM-DD dates to stay compatible with syncPhHolidays and the rest of the app
    const [holidayDates, setHolidayDates] = useState<string[]>([]);
    const [newHolidayDate, setNewHolidayDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [copyFromCampusId, setCopyFromCampusId] = useState('');
    const [copyingHolidays, setCopyingHolidays] = useState(false);
    const [copyMessage, setCopyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
            setCopyFromCampusId('');
            setCopyMessage(null);
        }
    }, [selectedCampus, fetchScheduleConfig]);

    useEffect(() => {
        if (scheduleConfig === undefined) return;
        setIncludeSaturday(scheduleConfig?.include_saturday ?? false);
        setIncludeSunday(scheduleConfig?.include_sunday ?? false);
        setDisabledWeekdays(scheduleConfig?.disabled_weekdays || []);
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
                disabled_weekdays: disabledWeekdays,
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

    const handleCopyHolidays = async () => {
        if (!selectedCampus || !copyFromCampusId) return;

        setCopyingHolidays(true);
        setCopyMessage(null);
        try {
            const { data, error } = await supabase
                .from('schedule_config')
                .select('holiday_dates')
                .eq('campus_id', copyFromCampusId)
                .maybeSingle();

            if (error) throw error;

            const sourceDates: string[] = data?.holiday_dates || [];
            if (sourceDates.length === 0) {
                setCopyMessage({ type: 'error', text: 'Selected campus has no holiday dates to copy.' });
                return;
            }

            const uniqueSorted = Array.from(new Set(sourceDates)).sort();
            setHolidayDates(uniqueSorted);
            setCopyMessage({ type: 'success', text: `Copied ${uniqueSorted.length} holiday date(s). Click "Save Configuration" to persist.` });
        } catch (err: any) {
            console.error('Failed to copy holiday dates:', err);
            setCopyMessage({ type: 'error', text: err?.message || 'Failed to copy holiday dates.' });
        } finally {
            setCopyingHolidays(false);
        }
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

                {/* Campus Tabs */}
                <div className="mb-6">
                    <p className="block text-sm font-medium text-gray-700 mb-2">Campus</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
                        {campuses.map((campus) => (
                            <button
                                key={campus.id}
                                type="button"
                                onClick={() => setSelectedCampus(campus.id)}
                                className={`h-10 w-full min-w-0 inline-flex items-center justify-center whitespace-nowrap truncate leading-none px-3 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm ${
                                    selectedCampus === campus.id
                                        ? 'bg-maroon-800 text-white border-maroon-800 ring-2 ring-maroon-200 ring-offset-1'
                                        : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500 hover:text-maroon-700'
                                }`}
                            >
                                {campus.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Day Toggles — all 7 weekdays (#4) */}
                <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-1">Available Days</h3>
                    <p className="text-sm text-gray-500 mb-4">Toggle which days are available for appointments at this campus.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {[
                            { label: 'Sunday',    day: 0 },
                            { label: 'Monday',    day: 1 },
                            { label: 'Tuesday',   day: 2 },
                            { label: 'Wednesday', day: 3 },
                            { label: 'Thursday',  day: 4 },
                            { label: 'Friday',    day: 5 },
                            { label: 'Saturday',  day: 6 },
                        ].map(({ label, day }) => {
                            const enabled = !disabledWeekdays.includes(day);
                            return (
                                <Toggle
                                    key={day}
                                    checked={enabled}
                                    onChange={(v) => {
                                        setDisabledWeekdays(prev =>
                                            v
                                                ? prev.filter(d => d !== day)
                                                : [...prev, day].sort((a, b) => a - b)
                                        );
                                    }}
                                    label={label}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Holiday Dates */}
                <div className="border rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-1">Holiday Dates</h3>
                    <p className="text-sm text-gray-500 mb-4">Add dates when the clinic is closed. No appointments will be scheduled on these dates.</p>

                    <div className="flex items-center gap-2 mb-4 w-full">
                        <input
                            type="date"
                            value={newHolidayDate}
                            onChange={(e) => setNewHolidayDate(clampDateYear(e.target.value))}
                            onBlur={(e) => setNewHolidayDate(clampDateYear(e.target.value))}
                            onInput={(e) => { if (!e.currentTarget.validity.valid) setNewHolidayDate(''); }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const pasted = e.clipboardData.getData('text');
                                setNewHolidayDate(clampDateYear(pasted));
                            }}
                            className="w-44 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                        />
                        <button
                            onClick={addHolidayDate}
                            disabled={!newHolidayDate}
                            className="shrink-0 px-4 py-2 bg-maroon-800 text-white rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 text-sm whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                        <select
                            value={copyFromCampusId}
                            onChange={(e) => setCopyFromCampusId(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                        >
                            <option value="">Copy holiday dates from another campus...</option>
                            {campuses
                                .filter((campus) => campus.id !== selectedCampus)
                                .map((campus) => (
                                    <option key={campus.id} value={campus.id}>
                                        {campus.name}
                                    </option>
                                ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleCopyHolidays}
                            disabled={!copyFromCampusId || copyingHolidays}
                            className="shrink-0 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                            {copyingHolidays ? 'Copying...' : 'Copy Holidays'}
                        </button>
                    </div>
                    {copyMessage && (
                        <p
                            className={`mb-4 text-sm rounded-lg px-3 py-2 border ${
                                copyMessage.type === 'success'
                                    ? 'text-green-700 bg-green-50 border-green-200'
                                    : 'text-red-700 bg-red-50 border-red-200'
                            }`}
                        >
                            {copyMessage.text}
                        </p>
                    )}

                    {holidayDates.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No holiday dates set</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                            {holidayDates.map((hd, idx) => (
                                <div key={`${hd}-${idx}`} className="w-full min-w-0 flex items-center justify-between gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                                    <span className="truncate">{formatDisplay(hd)}</span>
                                    <button
                                        onClick={() => removeHolidayDate(hd)}
                                        className="ml-1 shrink-0 hover:text-red-900 transition-colors"
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
                            className="px-6 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
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
