import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Appointment, AppointmentType, AppointmentStatus } from '~/types';
import { supabase } from '~/lib/supabase';

interface AppointmentFilters {
  campusId?: string;
  status?: AppointmentStatus;
  appointmentType?: AppointmentType;
  dateRange?: { start: string; end: string };
}

interface AppointmentState {
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  filters: AppointmentFilters;
  bookingCounts: Record<string, number>;
  isLoading: boolean;
  isSaving: boolean;

  fetchAppointments: (filters?: AppointmentFilters) => Promise<void>;
  fetchBookingCounts: (startDate: string, endDate: string, campusId?: string) => Promise<void>;
  createAppointment: (data: Partial<Appointment>) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  rescheduleDate: (date: string, unfinishedIds: string[], campusId: string) => Promise<void>;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  setFilters: (filters: Partial<AppointmentFilters>) => void;
}

export const useAppointmentStore = create<AppointmentState>()(
  immer((set) => ({
    appointments: [],
    selectedAppointment: null,
    filters: {},
    bookingCounts: {},
    isLoading: false,
    isSaving: false,

    fetchAppointments: async (filters) => {
      set({ isLoading: true });
      try {
        let query = supabase.from('appointments').select('*');

        if (filters?.campusId) query = query.eq('campus_id', filters.campusId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.appointmentType) query = query.eq('appointment_type', filters.appointmentType);
        if (filters?.dateRange) {
          query = query
            .gte('appointment_date', filters.dateRange.start)
            .lte('appointment_date', filters.dateRange.end);
        }

        const { data, error } = await query.order('appointment_date').order('start_time');
        if (error) throw error;

        set({ appointments: data || [], isLoading: false });
      } catch (error) {
        console.error('Error fetching appointments:', error);
        set({ isLoading: false });
        throw error;
      }
    },

    fetchBookingCounts: async (startDate, endDate, campusId) => {
      try {
        let query = supabase
          .from('appointments')
          .select('appointment_date')
          .neq('status', 'cancelled')
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);

        if (campusId) query = query.eq('campus_id', campusId);

        const { data, error } = await query;
        if (error) throw error;

        const counts: Record<string, number> = {};
        (data || []).forEach((row: { appointment_date: string }) => {
          counts[row.appointment_date] = (counts[row.appointment_date] || 0) + 1;
        });
        set({ bookingCounts: counts });
      } catch (error) {
        console.error('Error fetching booking counts:', error);
      }
    },

    createAppointment: async (data) => {
      set({ isSaving: true });
      try {
        const { data: newAppointment, error } = await supabase
          .from('appointments')
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        set((state) => {
          state.appointments.push(newAppointment);
          state.isSaving = false;
        });

        return newAppointment;
      } catch (error) {
        set({ isSaving: false });
        throw error;
      }
    },

    updateAppointment: async (id, data) => {
      set({ isSaving: true });
      try {
        const { error } = await supabase.from('appointments').update(data).eq('id', id);

        if (error) throw error;

        set((state) => {
          const index = state.appointments.findIndex((a) => a.id === id);
          if (index !== -1) {
            Object.assign(state.appointments[index], data);
          }
          state.isSaving = false;
        });
      } catch (error) {
        set({ isSaving: false });
        throw error;
      }
    },

    deleteAppointment: async (id) => {
      try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;

        set((state) => {
          state.appointments = state.appointments.filter((a) => a.id !== id);
        });
      } catch (error) {
        console.error('Error deleting appointment:', error);
        throw error;
      }
    },

    rescheduleDate: async (date, unfinishedIds, campusId) => {
      try {
        set({ isSaving: true });

        // Get booking setting for the campus
        const { data: setting } = await supabase
          .from('booking_settings')
          .select('max_bookings_per_day')
          .eq('campus_id', campusId)
          .single();

        const maxPerDay = setting?.max_bookings_per_day || 50;

        // Get schedule config for Saturday/Sunday and holidays
        const { data: schedConfig } = await supabase
          .from('schedule_config')
          .select('*')
          .eq('campus_id', campusId)
          .single();

        const includeSaturday = schedConfig?.include_saturday || false;
        const includeSunday = schedConfig?.include_sunday || false;
        const holidayDates: string[] = schedConfig?.holiday_dates || [];

        // Build list of eligible future dates starting from the day AFTER the rescheduled date
        const rescheduledDate = new Date(date + 'T00:00:00');
        const futureDates: string[] = [];
        for (let i = 1; i <= 90; i++) {
          const d = new Date(rescheduledDate);
          d.setDate(d.getDate() + i);
          const dow = d.getDay();

          // Skip Sunday (0) unless included
          if (dow === 0 && !includeSunday) continue;
          // Skip Saturday (6) unless included
          if (dow === 6 && !includeSaturday) continue;

          const dateStr = d.toISOString().split('T')[0];

          // Skip holidays
          if (holidayDates.includes(dateStr)) continue;
          // Skip the rescheduled date itself
          if (dateStr === date) continue;

          futureDates.push(dateStr);
        }

        // Get current booking counts for those dates
        const { data: existingCounts } = await supabase
          .from('appointments')
          .select('appointment_date')
          .neq('status', 'cancelled')
          .eq('campus_id', campusId)
          .in('appointment_date', futureDates);

        const countMap: Record<string, number> = {};
        (existingCounts || []).forEach((row: { appointment_date: string }) => {
          countMap[row.appointment_date] = (countMap[row.appointment_date] || 0) + 1;
        });

        // Spread unfinished appointments across available dates (closest first)
        let dateIndex = 0;
        for (const aptId of unfinishedIds) {
          // Find next date with available capacity
          while (dateIndex < futureDates.length) {
            const targetDate = futureDates[dateIndex];
            const currentCount = countMap[targetDate] || 0;
            if (currentCount < maxPerDay) {
              // Assign this appointment to this date
              const { error } = await supabase
                .from('appointments')
                .update({ appointment_date: targetDate, status: 'scheduled' })
                .eq('id', aptId);

              if (error) throw error;

              countMap[targetDate] = currentCount + 1;
              break;
            }
            dateIndex++;
          }
        }

        set({ isSaving: false });
      } catch (error) {
        console.error('Error rescheduling:', error);
        set({ isSaving: false });
        throw error;
      }
    },

    setSelectedAppointment: (appointment) => {
      set({ selectedAppointment: appointment });
    },

    setFilters: (newFilters) => {
      set((state) => {
        state.filters = { ...state.filters, ...newFilters };
      });
    },
  }))
);
