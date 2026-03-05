import { create } from 'zustand';
import { supabase } from '~/lib/supabase';
import type { Profile } from '~/types';

export interface PendingUser extends Profile {
    requested_role: string;
}

interface HRState {
    pendingUsers: PendingUser[];
    isLoading: boolean;
    fetchPendingUsers: () => Promise<void>;
    approveUser: (user: PendingUser) => Promise<void>;
    rejectUser: (user: PendingUser) => Promise<void>;
}

export const useHRStore = create<HRState>((set) => ({
    pendingUsers: [],
    isLoading: false,

    fetchPendingUsers: async () => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .not('requested_role', 'is', null)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            set({ pendingUsers: (data || []) as PendingUser[] });
        } catch (error) {
            console.error('Failed to fetch pending users:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    approveUser: async (user: PendingUser) => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { error } = await supabase
            .from('profiles')
            .update({ role: user.requested_role, requested_role: null })
            .eq('id', user.id);

        if (error) throw error;

        set((state) => ({
            pendingUsers: state.pendingUsers.filter((u) => u.id !== user.id),
        }));
    },

    rejectUser: async (user: PendingUser) => {
        const { error } = await supabase
            .from('profiles')
            .update({ requested_role: null })
            .eq('id', user.id);

        if (error) throw error;

        set((state) => ({
            pendingUsers: state.pendingUsers.filter((u) => u.id !== user.id),
        }));
    },
}));
