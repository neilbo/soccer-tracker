import { useState, useEffect } from 'react';
import { getInvitationByToken, acceptInvitationByToken, declineInvitationByToken } from '../../supabaseClient';

export function InvitationLanding({ token, user, onAcceptSuccess, onDecline, onLoginRequired }) {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  async function loadInvitation() {
    setLoading(true);
    setError('');

    const { invitation: inv, error: invError } = await getInvitationByToken(token);

    if (invError) {
      setError(invError.message || 'Invitation not found or has expired');
      setLoading(false);
      return;
    }

    // Check if invitation is expired
    if (inv && new Date(inv.expires_at) < new Date()) {
      setError('This invitation has expired');
      setLoading(false);
      return;
    }

    setInvitation(inv);
    setLoading(false);
  }

  async function handleAccept() {
    // Check if user is logged in
    if (!user) {
      // Store token in sessionStorage for after login/signup
      sessionStorage.setItem('pending_invitation_token', token);
      onLoginRequired();
      return;
    }

    // Check if user's email matches the invitation email
    if (invitation && user.email && user.email.toLowerCase() !== invitation.invitee_email.toLowerCase()) {
      setError(`This invitation was sent to ${invitation.invitee_email}. Please log in with that email address to accept this invitation.`);
      return;
    }

    setAccepting(true);
    setError('');

    const result = await acceptInvitationByToken(token);

    console.log('Accept invitation result:', result);

    if (result.error) {
      setError(result.error.message || 'Failed to accept invitation');
      setAccepting(false);
      return;
    }

    if (result.success) {
      // Store the team ID that we just joined so we can select it after reload
      if (result.teamId) {
        sessionStorage.setItem('justJoinedTeamId', result.teamId);
      } else if (result.clubId) {
        sessionStorage.setItem('justJoinedClubId', result.clubId);
      }

      onAcceptSuccess();
    } else {
      setError('Failed to accept invitation. Please try again.');
      setAccepting(false);
    }
  }

  async function handleDecline() {
    setDeclining(true);
    setError('');

    const { success, error: declineError } = await declineInvitationByToken(token);

    if (declineError) {
      setError(declineError.message || 'Failed to decline invitation');
      setDeclining(false);
      return;
    }

    if (success) {
      onDecline();
    } else {
      setError('Failed to decline invitation. Please try again.');
      setDeclining(false);
    }
  }

  const getRoleLabel = (role) => {
    if (role === 'team_staff') return 'Team Staff (Full Access)';
    if (role === 'club_admin') return 'Club Admin';
    return role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h2>
          <p className="text-gray-600">
            {invitation.inviter_name || 'Someone'} has invited you to join
          </p>
        </div>

        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {invitation.type === 'team' ? invitation.team_name : invitation.club_name}
            </h3>
            <p className="text-sm text-gray-600">
              {invitation.type === 'team' ? 'Team' : 'Club'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium text-gray-900">{getRoleLabel(invitation.role)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{invitation.invitee_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium text-gray-900">
                {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {!user && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-6">
            <p className="text-sm text-amber-800">
              You'll need to log in or create an account to accept this invitation.
            </p>
          </div>
        )}

        {user && invitation && user.email && user.email.toLowerCase() !== invitation.invitee_email.toLowerCase() && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-6">
            <p className="text-sm font-semibold text-amber-900 mb-1">Wrong Account</p>
            <p className="text-sm text-amber-800">
              This invitation was sent to <strong>{invitation.invitee_email}</strong>, but you're logged in as <strong>{user.email}</strong>.
              Please log out and sign in with the correct email address to accept this invitation.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            disabled={declining || accepting}
            className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {declining ? 'Declining...' : 'Decline'}
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting || declining || (user && invitation && user.email && user.email.toLowerCase() !== invitation.invitee_email.toLowerCase())}
            className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Accepting...' : user ? 'Accept Invitation' : 'Login to Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
