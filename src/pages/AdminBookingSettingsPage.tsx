import { useEffect, useState } from 'react';
import { Settings, Save, Check } from 'lucide-react';
import { useScheduleStore } from '~/modules/schedule';

export function AdminBookingSettingsPage() {
    const { campuses, fetchCampuses, fetchBookingSetting, bookingSetting, updateBookingSetting } = useScheduleStore();
    const [maxBookings, setMaxBookings] = useState<number>(50);
    const [selectedCampus, setSelectedCampus] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

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
            fetchBookingSetting(selectedCampus);
        }
    }, [selectedCampus, fetchBookingSetting]);

    useEffect(() => {
        setMaxBookings(bookingSetting?.max_bookings_per_day || 50);
    }, [bookingSetting]);

    const handleSave = async () => {
        if (!selectedCampus) return;
        setSaving(true);
        try {
            await updateBookingSetting(selectedCampus, maxBookings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save booking settings:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Booking Settings</h1>
                <p className="text-gray-600">Configure appointment booking limits per campus</p>
            </div>

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
                            value={selectedCampus}
                            onChange={(e) => setSelectedCampus(e.target.value)}
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
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    {saved && (
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
        </>
    );
}
