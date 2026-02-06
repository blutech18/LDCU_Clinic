import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ScheduleSetting, Campus, BookingSetting, Department } from '~/types';
import { supabase } from '~/lib/supabase';

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface ScheduleState {
  scheduleSettings: ScheduleSetting[];
  campuses: Campus[];
  departments: Department[];
  bookingSetting: BookingSetting | null;
  selectedCampusId: string | null;
  timeSlots: TimeSlot[];
  selectedDate: Date | null;
  weekOffset: number;
  isLoading: boolean;

  fetchScheduleSettings: (campusId?: string) => Promise<void>;
  fetchCampuses: () => Promise<void>;
  fetchDepartments: (campusId?: string) => Promise<void>;
  fetchBookingSetting: (campusId: string) => Promise<void>;
  updateBookingSetting: (campusId: string, maxPerDay: number) => Promise<void>;
  setSelectedCampus: (campusId: string | null) => void;
  generateTimeSlots: (date: Date, campusId: string) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setWeekOffset: (offset: number) => void;
}

export const useScheduleStore = create<ScheduleState>()(
  immer((set) => ({
    scheduleSettings: [],
    campuses: [],
    departments: [],
    bookingSetting: null,
    selectedCampusId: null,
    timeSlots: [],
    selectedDate: null,
    weekOffset: 0,
    isLoading: false,

    fetchScheduleSettings: async (campusId) => {
      set({ isLoading: true });
      try {
        let query = supabase.from('schedule_settings').select('*');
        if (campusId) query = query.eq('campus_id', campusId);

        const { data, error } = await query.order('day_of_week');
        if (error) throw error;

        set({ scheduleSettings: data || [], isLoading: false });
      } catch (error) {
        console.error('Error fetching schedule settings:', error);
        set({ isLoading: false });
        throw error;
      }
    },

    fetchCampuses: async () => {
      try {
        const { data, error } = await supabase.from('campuses').select('*').order('name');
        if (error) throw error;

        set({ campuses: data || [] });
      } catch (error) {
        console.error('Error fetching campuses:', error);
      }
    },

    fetchDepartments: async (campusId) => {
      try {
        let query = supabase.from('departments').select('*').order('name');
        if (campusId) query = query.eq('campus_id', campusId);
        const { data, error } = await query;
        if (error) throw error;
        set({ departments: data || [] });
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    },

    fetchBookingSetting: async (campusId) => {
      try {
        const { data, error } = await supabase
          .from('booking_settings')
          .select('*')
          .eq('campus_id', campusId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        set({ bookingSetting: data || null });
      } catch (error) {
        console.error('Error fetching booking setting:', error);
        set({ bookingSetting: null });
      }
    },

    updateBookingSetting: async (campusId, maxPerDay) => {
      try {
        const { data: existing } = await supabase
          .from('booking_settings')
          .select('id')
          .eq('campus_id', campusId)
          .single();

        if (existing) {
          const { error } = await supabase
            .from('booking_settings')
            .update({ max_bookings_per_day: maxPerDay, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('booking_settings')
            .insert({ campus_id: campusId, max_bookings_per_day: maxPerDay });
          if (error) throw error;
        }

        set({ bookingSetting: { campus_id: campusId, max_bookings_per_day: maxPerDay } as BookingSetting });
      } catch (error) {
        console.error('Error updating booking setting:', error);
        throw error;
      }
    },

    setSelectedCampus: (campusId) => {
      set({ selectedCampusId: campusId });
    },

    generateTimeSlots: async (date, campusId) => {
      set({ isLoading: true });
      try {
        const dayOfWeek = date.getDay();

        const { data: settings } = await supabase
          .from('schedule_settings')
          .select('*')
          .eq('campus_id', campusId)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true)
          .single();

        if (!settings) {
          set({ timeSlots: [], isLoading: false });
          return;
        }

        const slots: TimeSlot[] = [];
        const slotDuration = settings.slot_duration;
        const [startHour, startMin] = settings.start_time.split(':').map(Number);
        const [endHour, endMin] = settings.end_time.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes < endMinutes) {
          const startTime = `${Math.floor(currentMinutes / 60)
            .toString()
            .padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
          const endTime = `${Math.floor((currentMinutes + slotDuration) / 60)
            .toString()
            .padStart(2, '0')}:${((currentMinutes + slotDuration) % 60)
              .toString()
              .padStart(2, '0')}`;

          slots.push({
            date: date.toISOString().split('T')[0],
            startTime,
            endTime,
            isAvailable: true,
          });

          currentMinutes += slotDuration;
        }

        set({ timeSlots: slots, isLoading: false });
      } catch (error) {
        console.error('Error generating time slots:', error);
        set({ isLoading: false });
        throw error;
      }
    },

    setSelectedDate: (date) => {
      set({ selectedDate: date });
    },

    setWeekOffset: (offset) => {
      set({ weekOffset: offset });
    },
  }))
);
