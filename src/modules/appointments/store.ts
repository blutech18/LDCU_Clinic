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
  isLoading: boolean;
  isSaving: boolean;

  fetchAppointments: (filters?: AppointmentFilters) => Promise<void>;
  createAppointment: (data: Partial<Appointment>) => Promise<Appointment>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  setFilters: (filters: Partial<AppointmentFilters>) => void;
}

export const useAppointmentStore = create<AppointmentState>()(
  immer((set, get) => ({
    appointments: [],
    selectedAppointment: null,
    filters: {},
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
