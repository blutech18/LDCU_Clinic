import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Profile } from '~/types';
import { supabase } from '~/lib/supabase';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  sex?: 'male' | 'female';
  contactNumber?: string;
  campusId?: string;
  departmentId?: string;
}

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  verifyRole: (expectedRoles?: string[]) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  immer((set) => ({
    profile: null,
    isLoading: false,
    isAuthenticated: false,
    isInitialized: false,

    setProfile: (profile) => {
      set({ profile, isAuthenticated: !!profile });
    },

    initialize: async () => {
      set({ isLoading: true });
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!error && profile) {
            // Check verification
            if ('is_verified' in profile && !profile.is_verified && profile.role !== 'admin' && profile.role !== 'student' && profile.role !== 'staff') {
              await supabase.auth.signOut();
              set({ profile: null, isAuthenticated: false, isLoading: false, isInitialized: true });
              return;
            }
            set({ profile, isAuthenticated: true, isLoading: false, isInitialized: true });
          } else {
            set({ profile: null, isAuthenticated: false, isLoading: false, isInitialized: true });
          }
        } else {
          set({ profile: null, isAuthenticated: false, isLoading: false, isInitialized: true });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (_event === 'SIGNED_OUT') {
            set({ profile: null, isAuthenticated: false, isInitialized: true });
          } else if (_event === 'SIGNED_IN' && session) {
            // We could refetch profile here if needed, but login handles it usually.
            // This is mostly for external auth updates or token refreshes ensuring session validity
          }
        });

      } catch (error) {
        console.error('Error initializing auth:', error);
        set({ profile: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    },

    verifyRole: async (expectedRoles) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          set({ profile: null, isAuthenticated: false });
          return false;
        }

        const { data: freshProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !freshProfile) {
          await supabase.auth.signOut();
          set({ profile: null, isAuthenticated: false });
          return false;
        }

        // Update the stored profile with fresh data
        set({ profile: freshProfile });

        // If expectedRoles provided, check if current role matches
        // Do NOT sign out — just return false so the route can redirect appropriately
        if (expectedRoles && expectedRoles.length > 0) {
          if (!expectedRoles.includes(freshProfile.role)) {
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('Error verifying role:', error);
        return false;
      }
    },

    fetchProfile: async (userId) => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        set({ profile: data, isAuthenticated: true, isLoading: false });
      } catch (error) {
        console.error('Error fetching profile:', error);
        set({ isLoading: false });
        throw error;
      }
    },

    login: async (email, password) => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) throw profileError;

          // Check if user is verified (if is_verified field exists)
          if (profile && 'is_verified' in profile && !profile.is_verified && profile.role !== 'admin' && profile.role !== 'student' && profile.role !== 'staff') {
            await supabase.auth.signOut();
            throw new Error('Your account is pending verification. Please wait for an admin to approve your account.');
          }

          set({ profile, isAuthenticated: true, isLoading: false });
        }
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    loginWithGoogle: async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // The actual navigation happens via OAuth redirect
        // Profile will be fetched after callback
      } catch (error) {
        console.error('Error with Google login:', error);
        throw error;
      }
    },

    register: async (data: RegisterData) => {
      set({ isLoading: true });
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;

        if (authData.user) {
          const profileData: any = {
            id: authData.user.id,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            role: 'employee',
            is_verified: false,
          };

          // Add optional fields if provided
          if (data.middleName) profileData.middle_name = data.middleName;
          if (data.dateOfBirth) profileData.date_of_birth = data.dateOfBirth;
          if (data.sex) profileData.sex = data.sex;
          if (data.contactNumber) profileData.contact_number = data.contactNumber;
          if (data.campusId) profileData.campus_id = data.campusId;
          if (data.departmentId) profileData.department_id = data.departmentId;

          const { error: profileError } = await supabase
            .from('profiles')
            .insert(profileData);

          if (profileError) throw profileError;

          // Don't set profile or authenticate - user needs verification
          set({ isLoading: false });
        }
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        await supabase.auth.signOut();
        set({ profile: null, isAuthenticated: false });
      } catch (error) {
        console.error('Error logging out:', error);
        throw error;
      }
    },

    clearAuth: () => {
      set({ profile: null, isAuthenticated: false });
    },
  }))
);
