import { useAppointmentStore } from '../store';
import { AppointmentCard } from './AppointmentCard';

export function AppointmentList() {
  const { appointments, isLoading, setSelectedAppointment } = useAppointmentStore();

  if (isLoading) {
    return <div className="text-center py-8">Loading appointments...</div>;
  }

  if (appointments.length === 0) {
    return <div className="text-center py-8 text-gray-500">No appointments found</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onClick={() => setSelectedAppointment(appointment)}
        />
      ))}
    </div>
  );
}
