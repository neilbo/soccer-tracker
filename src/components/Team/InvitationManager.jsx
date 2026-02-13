import { useState, useEffect } from 'react';
import {
  getTeamInvitations,
  createInvitation,
  cancelInvitation,
} from '../../supabaseClient';

export function InvitationManager({ teamId, onClose }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('team_staff');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [teamId]);

  async function loadInvitations() {
    setLoading(true);
    const { invitations: data, error } = await getTeamInvitations(teamId);
    if (!error) {
      setInvitations(data);
    }
    setLoading(false);
  }

  async function handleSendInvitation(e) {
    e.preventDefault();
    setError('');
    setSending(true);

    // Validate email
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      setSending(false);
      return;
    }

    const { invitation, error: inviteError } = await createInvitation(
      teamId,
      email.trim().toLowerCase(),
      role
    );

    if (inviteError) {
      if (inviteError.message?.includes('duplicate')) {
        setError('An invitation has already been sent to this email');
      } else {
        setError(inviteError.message || 'Failed to send invitation');
      }
      setSending(false);
      return;
    }

    // Success - generate invitation link
    if (invitation?.token) {
      const link = `${window.location.origin}/invite/${invitation.token}`;
      setInvitationLink(link);
    }

    setEmail('');
    setRole('team_staff');
    await loadInvitations();
    setSending(false);
  }

  async function handleCancelInvitation(invitationId) {
    const { success } = await cancelInvitation(invitationId);
    if (success) {
      await loadInvitations();
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      accepted: 'bg-green-100 text-green-700',
      declined: 'bg-gray-100 text-gray-700',
      expired: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Team Invitations</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Send new invitation */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Send Invitation</h3>
            <form onSubmit={handleSendInvitation} className="space-y-3">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="teammate@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  disabled={sending}
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  disabled={sending}
                >
                  <option value="team_staff">Team Staff (Full Access)</option>
                  <option value="club_admin">Club Admin (Read Only)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Team Staff can edit everything. Club Admins can only view.
                </p>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>

            {/* Show invitation link after creation */}
            {invitationLink && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-900 mb-1">Invitation Link Created!</p>
                  <p className="text-xs text-gray-600">Copy and share this link with the invitee via email, Slack, or any messaging app.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invitationLink}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-mono text-gray-700"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending invitations */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Invitations</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No invitations yet</div>
            ) : (
              <div className="space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 truncate">{inv.invitee_email}</span>
                        {getStatusBadge(inv.status)}
                        {inv.status === 'pending' && isExpired(inv.expires_at) && (
                          <span className="text-xs text-red-500">(Expired)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        <span>
                          {inv.role === 'team_staff' ? 'Team Staff' : 'Club Admin'} · Sent by {inv.inviter_name}
                        </span>
                        {inv.status === 'pending' && !isExpired(inv.expires_at) && (
                          <span> · Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="ml-3 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
