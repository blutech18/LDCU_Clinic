import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/modules/auth/store';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setProfile } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL (Supabase handles the hash automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Auth callback error:', sessionError);
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (!session?.user) {
          console.error('No session found');
          navigate('/login');
          return;
        }

        // Check if profile exists
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new users
          console.error('Error fetching profile:', profileError);
          setError('Error loading profile. Please try again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (existingProfile) {
          // Profile exists - check verification
          if ('is_verified' in existingProfile && !existingProfile.is_verified && existingProfile.role !== 'admin') {
            await supabase.auth.signOut();
            setError('Your account is pending verification. Please wait for admin approval.');
            setTimeout(() => navigate('/login'), 3000);
            return;
          }

          setProfile(existingProfile);
          navigate('/dashboard');
        } else {
          // New user - create profile
          const userMetadata = session.user.user_metadata;
          const email = session.user.email;

          const newProfile = {
            id: session.user.id,
            email: email,
            first_name: userMetadata?.full_name?.split(' ')[0] || userMetadata?.name?.split(' ')[0] || 'User',
            last_name: userMetadata?.full_name?.split(' ').slice(1).join(' ') || userMetadata?.name?.split(' ').slice(1).join(' ') || '',
            role: 'employee',
            is_verified: false,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            setError('Error creating profile. Please try again.');
            setTimeout(() => navigate('/login'), 2000);
            return;
          }

          // Sign out immediately since new users need verification
          await supabase.auth.signOut();
          setError('Account created! Please wait for admin verification before logging in.');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleCallback();
  }, [navigate, setProfile]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-800 font-medium">{error}</p>
            <p className="mt-2 text-sm text-gray-600">Redirecting...</p>
          </>
        ) : (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-800"></div>
            <p className="mt-4 text-gray-600">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}
