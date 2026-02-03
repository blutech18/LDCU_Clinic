import { useScheduleStore } from '../store';
import { TimeSlot } from './TimeSlot';

export function CalendarView() {
  const { timeSlots, isLoading } = useScheduleStore();

  if (isLoading) {
    return <div className="text-center py-8">Loading schedule...</div>;
  }

  if (timeSlots.length === 0) {
    return <div className="text-center py-8 text-gray-500">No time slots available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {timeSlots.map((slot) => (
          <TimeSlot key={`${slot.date}-${slot.startTime}`} slot={slot} />
        ))}
      </div>
    </div>
  );
}
