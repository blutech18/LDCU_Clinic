import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Appointment, AppointmentType, AppointmentStatus } from '~/types';
import { supabase } from '~/lib/supabase';
import { logUserAction } from '~/lib/auditLog';

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
  amPmBookingCounts: Record<string, { AM: number, PM: number }>;
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
    amPmBookingCounts: {},
    isLoading: false,
    isSaving: false,

    fetchAppointments: async (filters) => {
      set({ isLoading: true });
      try {
        let query = supabase
          .from('appointments')
          .select(`*, profiles:patient_id (avatar_url)`);

        if (filters?.campusId) {
          query = query.eq('campus_id', filters.campusId);
        }

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
          .select('appointment_date, time_of_day')
          .neq('status', 'cancelled')
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);

        if (campusId) query = query.eq('campus_id', campusId);

        const { data, error } = await query;
        if (error) throw error;

        const counts: Record<string, number> = {};
        const amPmCounts: Record<string, { AM: number, PM: number }> = {};
        
        (data || []).forEach((row: { appointment_date: string, time_of_day?: 'AM' | 'PM' }) => {
          const date = row.appointment_date;
          counts[date] = (counts[date] || 0) + 1;
          
          if (!amPmCounts[date]) {
            amPmCounts[date] = { AM: 0, PM: 0 };
          }
          if (row.time_of_day === 'AM') amPmCounts[date].AM += 1;
          if (row.time_of_day === 'PM') amPmCounts[date].PM += 1;
        });
        
        set({ bookingCounts: counts, amPmBookingCounts: amPmCounts });
      } catch (error) {
        console.error('Error fetching booking counts:', error);
      }
    },

    createAppointment: async (data) => {
      set({ isSaving: true });
      try {
        // Use the atomic book_appointment() DB function with advisory lock
        // to prevent race conditions and double-booking
        const { data: result, error } = await supabase.rpc('book_appointment', {
          p_patient_id: data.patient_id ?? null,
          p_campus_id: data.campus_id,
          p_appointment_type: data.appointment_type ?? 'consultation',
          p_appointment_date: data.appointment_date,
          p_start_time: data.start_time ?? '08:00',
          p_end_time: data.end_time ?? '12:00',
          p_status: data.status ?? 'scheduled',
          p_time_of_day: data.time_of_day ?? 'AM',
          p_notes: data.notes ?? null,
          p_patient_name: data.patient_name ?? null,
          p_patient_email: data.patient_email ?? null,
          p_patient_phone: data.patient_phone ?? null,
          p_booker_role: data.booker_role ?? 'student',
        });

        if (error) {
          // Surface user-friendly messages for booking errors
          if (error.message?.includes('ALREADY_BOOKED')) {
            throw new Error('You already have a scheduled appointment. Please complete or cancel it before booking a new one.');
          }
          if (error.message?.includes('FULLY_BOOKED_AM')) {
            throw new Error('The morning (AM) session is fully booked. Please select a different time or date.');
          }
          if (error.message?.includes('FULLY_BOOKED_PM')) {
            throw new Error('The afternoon (PM) session is fully booked. Please select a different time or date.');
          }
          if (error.message?.includes('FULLY_BOOKED')) {
            throw new Error('This date is fully booked. Please select another date.');
          }
          throw error;
        }

        const newAppointment = result as Appointment;

        // Log appointment creation
        await logUserAction({
          action: 'CREATE',
          resourceType: 'appointment',
          resourceId: newAppointment.id,
          campusId: newAppointment.campus_id,
          details: {
            appointment_type: newAppointment.appointment_type,
            appointment_date: newAppointment.appointment_date,
            patient_name: newAppointment.patient_name,
          },
        });

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
        // Get current appointment for audit log
        const currentApt = await supabase.from('appointments').select('*').eq('id', id).single();

        const { error } = await supabase.from('appointments').update(data).eq('id', id);

        if (error) throw error;

        // Log appointment update
        if (currentApt.data) {
          await logUserAction({
            action: 'UPDATE',
            resourceType: 'appointment',
            resourceId: id,
            campusId: currentApt.data.campus_id,
            details: {
              changes: data,
              previous_status: currentApt.data.status,
              new_status: data.status,
            },
          });
        }

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
        // Get appointment details before deleting
        const { data: apt } = await supabase.from('appointments').select('*').eq('id', id).single();

        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) throw error;

        // Log appointment deletion
        if (apt) {
          await logUserAction({
            action: 'DELETE',
            resourceType: 'appointment',
            resourceId: id,
            campusId: apt.campus_id,
            details: {
              patient_name: apt.patient_name,
              appointment_date: apt.appointment_date,
              appointment_type: apt.appointment_type,
            },
          });
        }

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

        // Always start from TOMORROW, regardless of the original appointment date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 1); // tomorrow

        const futureDates: string[] = [];
        for (let i = 0; i < 90; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dow = d.getDay();

          if (dow === 0 && !includeSunday) continue;
          if (dow === 6 && !includeSaturday) continue;

          const dateStr = d.toISOString().split('T')[0];

          if (holidayDates.includes(dateStr)) continue;
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
        // Uses the atomic reschedule_appointment() DB function with advisory locks
        let dateIndex = 0;
        for (const aptId of unfinishedIds) {
          while (dateIndex < futureDates.length) {
            const targetDate = futureDates[dateIndex];
            const currentCount = countMap[targetDate] || 0;
            if (currentCount < maxPerDay) {
              const { error } = await supabase.rpc('reschedule_appointment', {
                p_appointment_id: aptId,
                p_target_date: targetDate,
                p_campus_id: campusId,
              });

              if (error) {
                // If target date is full (race condition), try next date
                if (error.message?.includes('FULLY_BOOKED')) {
                  dateIndex++;
                  continue;
                }
                throw error;
              }

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
