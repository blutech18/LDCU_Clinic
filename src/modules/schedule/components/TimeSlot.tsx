import { formatTime } from '~/lib/utils';

interface TimeSlotProps {
  slot: {
    date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  };
  onSelect?: () => void;
}

export function TimeSlot({ slot, onSelect }: TimeSlotProps) {
  return (
    <button
      disabled={!slot.isAvailable}
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition-all duration-300 ${
        slot.isAvailable
          ? 'border-gray-300 bg-white hover:border-maroon-500 hover:bg-maroon-50 hover:scale-105 hover:shadow-md'
          : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
        </span>
        {slot.isAvailable ? (
          <span className="text-sm text-green-600 font-medium">Available</span>
        ) : (
          <span className="text-sm text-gray-500">Booked</span>
        )}
      </div>
    </button>
  );
}
