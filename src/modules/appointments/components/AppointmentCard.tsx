import { Calendar, Clock } from 'lucide-react';
import type { Appointment } from '~/types';
import { formatDate, formatTime } from '~/lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
  };

  return (
    <div
      onClick={onClick}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-scale-in"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{appointment.patient_name}</h3>
          <p className="text-sm text-gray-600 capitalize">
            {appointment.appointment_type.replace('_', ' ')}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium transition-colors duration-200 ${
            statusColors[appointment.status]
          }`}
        >
          {appointment.status}
        </span>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="mr-2 h-4 w-4" />
          {formatDate(appointment.appointment_date)}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="mr-2 h-4 w-4" />
          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
        </div>
      </div>
    </div>
  );
}
