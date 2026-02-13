import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { migrateGuestDataToTeam } from '../../supabaseClient';

export function SignupScreen({ onSwitchToLogin, onContinueAsGuest }) {
  const { signUp, createNewTeam } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [migratingData, setMigratingData] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Sign up the user
    const { user, error: signUpError } = await signUp(email, password, fullName);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Create initial team if team name provided
    let createdTeamId = null;
    if (teamName.trim() && user) {
      const { team, error: teamError } = await createNewTeam(teamName.trim());

      if (teamError) {
        console.error('Error creating team:', teamError);
        // Don't show error to user - they can create team later
      } else if (team) {
        createdTeamId = team.id;
      }
    }

    // Migrate guest data if any exists
    if (createdTeamId) {
      setMigratingData(true);
      const { success, error: migrationError } = await migrateGuestDataToTeam(createdTeamId);

      if (success) {
        console.log('Guest data migrated successfully');
        // Clear the guest data from localStorage after successful migration
        localStorage.removeItem('soccer-tracker-data');
      } else if (migrationError) {
        console.error('Error migrating guest data:', migrationError);
        // Don't block signup - user can manually re-enter data if needed
      }
      setMigratingData(false);
    }

    // Success - auth state change will handle navigation
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Get Started</h1>
          <p className="text-gray-600 mt-2">Create your soccer tracker account</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            </div>

            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
                Team Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="teamName"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. U10 Academy"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">You can create or join teams later</p>
            </div>

            <button
              type="submit"
              disabled={loading || migratingData}
              className="w-full px-6 py-3.5 text-lg font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              {migratingData ? 'Migrating your data...' : loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Guest Mode Button */}
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-full px-5 py-3 text-base font-medium rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-95"
          >
            Continue as Guest
          </button>

          {/* Login Link */}
          <p className="text-center mt-4 text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-gray-500">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
