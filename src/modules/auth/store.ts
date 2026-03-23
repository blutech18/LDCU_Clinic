import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Profile } from '~/types';
import { supabase } from '~/lib/supabase';

// ─── Idle Session Timeout (30 minutes) ───────────────────────────────────────
// Auto-logout after 30 min of inactivity. Protects shared campus computers.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let _idleTimer: ReturnType<typeof setTimeout> | null = null;

function resetIdleTimer(onTimeout: () => void) {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(onTimeout, IDLE_TIMEOUT_MS);
}

function startIdleWatcher(onTimeout: () => void) {
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  const reset = () => resetIdleTimer(onTimeout);
  events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
  resetIdleTimer(onTimeout); // Start the first timer
  return () => {
    if (_idleTimer) clearTimeout(_idleTimer);
    events.forEach((e) => window.removeEventListener(e, reset));
  };
}

let _stopIdleWatcher: (() => void) | null = null;
// ─────────────────────────────────────────────────────────────────────────────

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
  avatarUrl: string | null;
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
  deleteAccount: () => Promise<void>;
}

// Guard to prevent initialize() from running more than once
let _initStarted = false;

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    profile: null,
    avatarUrl: null,
    isLoading: false,
    isAuthenticated: false,
    isInitialized: false,

    setProfile: (profile) => {
      set({ profile, isAuthenticated: !!profile });
    },

    initialize: async () => {
      // Prevent double-initialization (React StrictMode, fast re-renders, etc.)
      if (_initStarted) return;
      _initStarted = true;

      set({ isLoading: true });
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && profile) {
            // Check verification
            if ('is_verified' in profile && !profile.is_verified && profile.role !== 'admin' && profile.role !== 'student' && profile.role !== 'staff' && profile.role !== 'hr' && profile.role !== 'pending') {
              await supabase.auth.signOut();
              set({ profile: null, avatarUrl: null, isAuthenticated: false, isLoading: false, isInitialized: true });
              return;
            }

            // Session invalidation: if admin changed this user's role, force re-login
            if (profile.force_reauth_at) {
              const reauthAt = new Date(profile.force_reauth_at).getTime();
              const sessionCreatedAt = session.user.last_sign_in_at
                ? new Date(session.user.last_sign_in_at).getTime()
                : 0;
              if (reauthAt > sessionCreatedAt) {
                await supabase.auth.signOut();
                set({ profile: null, avatarUrl: null, isAuthenticated: false, isLoading: false, isInitialized: true });
                return;
              }
            }

            const sessionAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;
            const avatarUrl = sessionAvatar || profile.avatar_url || null;
            // Persist avatar_url to profile if from Google and not already saved
            if (sessionAvatar && !profile.avatar_url) {
              // Fire-and-forget — don't await to avoid blocking init
              Promise.resolve(supabase.from('profiles').update({ avatar_url: sessionAvatar }).eq('id', session.user.id)).catch(() => { });
              profile.avatar_url = sessionAvatar;
            }
            set({ profile, avatarUrl, isAuthenticated: true, isLoading: false, isInitialized: true });

            // Start idle watcher — auto-logout after 30 min of inactivity
            if (_stopIdleWatcher) _stopIdleWatcher();
            _stopIdleWatcher = startIdleWatcher(async () => {
              await supabase.auth.signOut();
              set({ profile: null, avatarUrl: null, isAuthenticated: false, isInitialized: true });
              if (_stopIdleWatcher) { _stopIdleWatcher(); _stopIdleWatcher = null; }
            });
          } else {
            set({ profile: null, avatarUrl: null, isAuthenticated: false, isLoading: false, isInitialized: true });
          }
        } else {
          set({ profile: null, avatarUrl: null, isAuthenticated: false, isLoading: false, isInitialized: true });
        }

        // Listen for auth changes — keep this handler MINIMAL.
        // Only handle sign-out. Never call set() for token refreshes or SIGNED_IN
        // because Supabase fires these events on every token refresh, which
        // would cause infinite re-render loops in React components.
        supabase.auth.onAuthStateChange((_event) => {
          if (_event === 'SIGNED_OUT') {
            if (_stopIdleWatcher) { _stopIdleWatcher(); _stopIdleWatcher = null; }
            set({ profile: null, avatarUrl: null, isAuthenticated: false, isInitialized: true });
          }
          // All other events (SIGNED_IN, TOKEN_REFRESHED, etc.) — do nothing.
          // The profile is already loaded from initialize(). Token refresh
          // is handled internally by Supabase and doesn't need any React state updates.
        });

      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error initializing auth:', error);
        }
        set({ profile: null, avatarUrl: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    },

    verifyRole: async (expectedRoles) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          set({ profile: null, isAuthenticated: false });
          return false;
        }

        // Use cached profile — avoids DB fetch + re-render on every route guard check
        const cachedProfile = get().profile;
        if (cachedProfile && cachedProfile.id === session.user.id) {
          if (expectedRoles && expectedRoles.length > 0) {
            return expectedRoles.includes(cachedProfile.role);
          }
          return true;
        }

        // No cached profile (shouldn't happen normally) — fetch fresh
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

        // Only update store if profile actually changed (prevents re-render loops)
        if (!cachedProfile || cachedProfile.id !== freshProfile.id) {
          set({ profile: freshProfile, isAuthenticated: true });
        }

        if (expectedRoles && expectedRoles.length > 0) {
          if (!expectedRoles.includes(freshProfile.role)) {
            return false;
          }
        }

        return true;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error verifying role:', error);
        }
        return false;
      }
    },

    fetchProfile: async (userId: string) => {
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
        if (import.meta.env.DEV) {
          console.error('Error fetching profile:', error);
        }
        set({ isLoading: false });
        throw error;
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        // Check rate limit before attempting login
        const { data: rateLimitCheck } = await supabase.rpc('check_login_rate_limit', {
          p_email: email.toLowerCase(),
        });

        if (rateLimitCheck && !rateLimitCheck.allowed) {
          const lockoutUntil = new Date(rateLimitCheck.lockout_until);
          const minutesRemaining = Math.ceil((lockoutUntil.getTime() - Date.now()) / 60000);
          throw new Error(
            `Too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`
          );
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Record failed login attempt
          await supabase.rpc('record_login_attempt', {
            p_email: email.toLowerCase(),
            p_success: false,
          });
          throw error;
        }

        // Record successful login attempt
        await supabase.rpc('record_login_attempt', {
          p_email: email.toLowerCase(),
          p_success: true,
        });

        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) throw profileError;

          // Check if user is verified (if is_verified field exists)
          if (profile && 'is_verified' in profile && !profile.is_verified && profile.role !== 'admin' && profile.role !== 'student' && profile.role !== 'staff' && profile.role !== 'hr' && profile.role !== 'pending') {
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

    deleteAccount: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');

        // Delete user's profile and related data
        // Note: This requires a Supabase Edge Function or database trigger
        // to handle cascading deletes and auth.users cleanup
        const { error } = await supabase.functions.invoke('delete-account', {
          body: { userId: user.id },
        });

        if (error) throw error;

        // Sign out after successful deletion
        await supabase.auth.signOut();
        set({ profile: null, avatarUrl: null, isAuthenticated: false });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error deleting account:', error);
        }
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
        if (import.meta.env.DEV) {
          console.error('Error with Google login:', error);
        }
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
            role: 'pending',
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
        if (_stopIdleWatcher) { _stopIdleWatcher(); _stopIdleWatcher = null; }
        await supabase.auth.signOut();
        set({ profile: null, avatarUrl: null, isAuthenticated: false });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error logging out:', error);
        }
        throw error;
      }
    },

    clearAuth: () => {
      set({ profile: null, avatarUrl: null, isAuthenticated: false });
    },
  }))
);
