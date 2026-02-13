import { useState, useEffect } from 'react';
import {
  getMyClubInvitations,
  acceptClubInvitation,
  declineClubInvitation,
} from '../../supabaseClient';
import { useAuth } from '../../hooks/useAuth';

export function PendingClubInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const { loadUserClubs } = useAuth();

  useEffect(() => {
    loadInvitations();
  }, []);

  async function loadInvitations() {
    setLoading(true);
    const { invitations: data } = await getMyClubInvitations();
    setInvitations(data);
    setLoading(false);
  }

  async function handleAccept(invitation) {
    setProcessing(invitation.id);
    const { success, error } = await acceptClubInvitation(invitation.token);

    if (success) {
      // Refresh clubs to include the newly joined club
      await loadUserClubs();
      // Remove from list
      setInvitations(invitations.filter(inv => inv.id !== invitation.id));
    } else {
      alert(error?.message || 'Failed to accept invitation');
    }
    setProcessing(null);
  }

  async function handleDecline(invitationId) {
    setProcessing(invitationId);
    const { success } = await declineClubInvitation(invitationId);

    if (success) {
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    }
    setProcessing(null);
  }

  if (loading) {
    return null;
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
        <h3 className="font-semibold text-gray-900">
          Club Invitations ({invitations.length})
        </h3>
      </div>

      <div className="space-y-2">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="bg-white rounded-xl border border-purple-200 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 mb-1">{inv.club_name}</div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{inv.inviter_name}</span> invited you as{' '}
                  <span className="font-medium">
                    {inv.role === 'team_staff' ? 'Team Staff' : 'Club Admin'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(inv)}
                  disabled={processing === inv.id}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {processing === inv.id ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  onClick={() => handleDecline(inv.id)}
                  disabled={processing === inv.id}
                  className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
