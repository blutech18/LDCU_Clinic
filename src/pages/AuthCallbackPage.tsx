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
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Error loading profile. Please try again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        if (existingProfile) {
          // Profile exists - check verification
          if ('is_verified' in existingProfile && !existingProfile.is_verified && existingProfile.role !== 'admin' && existingProfile.role !== 'student' && existingProfile.role !== 'staff' && existingProfile.role !== 'hr' && existingProfile.role !== 'pending') {
            await supabase.auth.signOut();
            setError('Your account is pending verification. Please wait for admin approval.');
            setTimeout(() => navigate('/login'), 3000);
            return;
          }

          setProfile(existingProfile);
          // If user hasn't selected a role yet, redirect to role selection
          if (existingProfile.role_selected === false || existingProfile.role === 'pending') {
            // Fix role to 'pending' if it was auto-set to 'student' by old DB default
            if (existingProfile.role === 'student' && existingProfile.role_selected === false) {
              await supabase.from('profiles').update({ role: 'pending' }).eq('id', existingProfile.id);
              setProfile({ ...existingProfile, role: 'pending' });
            }
            navigate('/select-role');
          } else {
            navigate('/dashboard');
          }
        } else {
          // Check if there's a nurse invitation for this email
          const { data: nurseInvitation, error: inviteError } = await supabase
            .from('nurse_invitations')
            .select('*')
            .eq('email', session.user.email?.toLowerCase())
            .is('used_at', null)
            .maybeSingle();

          if (!inviteError && nurseInvitation) {
            // Found a nurse invitation - create profile as nurse
            const userMetadata = session.user.user_metadata;
            
            const { data: nurseProfile, error: createNurseError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email?.toLowerCase(),
                first_name: nurseInvitation.first_name || userMetadata?.full_name?.split(' ')[0] || 'User',
                last_name: nurseInvitation.last_name || userMetadata?.full_name?.split(' ').slice(1).join(' ') || '',
                role: 'nurse',
                is_verified: true,
                role_selected: true,
                assigned_campus_id: nurseInvitation.assigned_campus_id,
                avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
              })
              .select()
              .single();

            if (createNurseError) {
              console.error('Error creating nurse profile:', createNurseError);
              setError('Error creating your account. Please try again.');
              setTimeout(() => navigate('/login'), 2000);
              return;
            }

            // Mark the invitation as used
            await supabase
              .from('nurse_invitations')
              .update({
                used_at: new Date().toISOString(),
                used_by: session.user.id,
              })
              .eq('id', nurseInvitation.id);

            setProfile(nurseProfile);
            navigate('/dashboard');
            return;
          }
          // New user - create or update profile
          const userMetadata = session.user.user_metadata;

          const newProfile = {
            id: session.user.id,
            email: session.user.email,
            first_name: userMetadata?.full_name?.split(' ')[0] || userMetadata?.name?.split(' ')[0] || 'User',
            last_name: userMetadata?.full_name?.split(' ').slice(1).join(' ') || userMetadata?.name?.split(' ').slice(1).join(' ') || '',
            role: 'pending',
            is_verified: true,
            role_selected: false,
          };

          const { data: upsertedProfile, error: createError } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select()
            .single();

          if (createError) {
            // If upsert still fails, try fetching existing profile as fallback
            const { data: fallbackProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (fallbackProfile) {
              setProfile(fallbackProfile);
              if (fallbackProfile.role_selected === false) {
                navigate('/select-role');
              } else {
                navigate('/dashboard');
              }
              return;
            }

            console.error('Error creating profile:', createError);
            setError('Error creating profile. Please try again.');
            setTimeout(() => navigate('/login'), 2000);
            return;
          }

          const profileData = upsertedProfile || newProfile;
          setProfile(profileData as any);

          // If role not yet selected, go to role selection
          if (profileData.role_selected === false) {
            navigate('/select-role');
          } else {
            navigate('/dashboard');
          }
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
        {error && (
          <>
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-800 font-medium">{error}</p>
            <p className="mt-2 text-sm text-gray-600">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}
