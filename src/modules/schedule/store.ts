import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ScheduleSetting, Campus } from '~/types';
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
  selectedCampusId: string | null;
  timeSlots: TimeSlot[];
  selectedDate: Date | null;
  weekOffset: number;
  isLoading: boolean;

  fetchScheduleSettings: (campusId?: string) => Promise<void>;
  fetchCampuses: () => Promise<void>;
  setSelectedCampus: (campusId: string | null) => void;
  generateTimeSlots: (date: Date, campusId: string) => Promise<void>;
  setSelectedDate: (date: Date | null) => void;
  setWeekOffset: (offset: number) => void;
}

export const useScheduleStore = create<ScheduleState>()(
  immer((set) => ({
    scheduleSettings: [],
    campuses: [],
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
