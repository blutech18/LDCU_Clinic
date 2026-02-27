import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Profile } from '~/types';
import { supabase } from '~/lib/supabase';

interface AdminState {
  users: Profile[];
  isLoadingUsers: boolean;

  fetchUsers: () => Promise<void>;
  verifyUser: (userId: string, verified: boolean) => Promise<void>;
  changeRole: (userId: string, role: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>()(
  immer((set) => ({
    users: [],
    isLoadingUsers: false,

    fetchUsers: async () => {
      set({ isLoadingUsers: true });
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        set({ users: data || [] });
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        set({ isLoadingUsers: false });
      }
    },

    verifyUser: async (userId, verified) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_verified: verified })
          .eq('id', userId);

        if (error) throw error;

        set((state) => {
          const user = state.users.find((u) => u.id === userId);
          if (user) user.is_verified = verified;
        });
      } catch (error) {
        console.error('Failed to update verification status:', error);
        throw error;
      }
    },

    changeRole: async (userId, role) => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', userId);

        if (error) throw error;

        set((state) => {
          const user = state.users.find((u) => u.id === userId);
          if (user) user.role = role as Profile['role'];
        });
      } catch (error) {
        console.error('Failed to update role:', error);
        throw error;
      }
    },
  }))
);
