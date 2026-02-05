import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Button } from '~/components/ui/Button';

export function LoginForm() {
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { loginWithGoogle } = useAuthStore();
  const [searchParams] = useSearchParams();

  const pendingVerification = searchParams.get('pending') === 'true';
  const urlError = searchParams.get('error');

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      // Navigation will be handled by OAuth callback
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {pendingVerification && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium">Account Pending Verification</p>
          <p className="mt-1">Your account is awaiting admin approval. Please check back later.</p>
        </div>
      )}

      {(error || urlError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error || (urlError === 'auth_failed' ? 'Authentication failed. Please try again.' :
            urlError === 'profile_creation_failed' ? 'Failed to create profile. Please contact support.' :
              urlError)}
        </div>
      )}

      <Button
        type="button"
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full flex items-center justify-center gap-2"
        disabled={isGoogleLoading}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
      </Button>
    </div>
  );
}
