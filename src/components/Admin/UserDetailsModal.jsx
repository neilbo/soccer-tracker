import { useState } from 'react';
import { removeUserFromTeam, removeUserFromClub, updateUserRole } from '../../supabaseClient';
import { useAuth } from '../../hooks/useAuth';

export function UserDetailsModal({ user, onClose, onUpdate }) {
  const { user: currentUser } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [changingRole, setChangingRole] = useState(null);

  // Check if viewing own profile and is super admin
  const isViewingSelf = currentUser?.id === user.user_id;
  const canModifyOwnProfile = !(isViewingSelf && user.is_super_admin);

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function handleRemoveFromTeam(teamMembership) {
    if (!canModifyOwnProfile) {
      alert('You cannot remove yourself from teams while you are a super admin.');
      return;
    }

    if (!confirm(`Remove ${user.full_name || user.email} from team "${teamMembership.team_name}"?`)) {
      return;
    }

    setProcessing(true);
    const { success, error } = await removeUserFromTeam(user.user_id, teamMembership.team_id);

    if (error) {
      alert('Error removing user from team: ' + error.message);
    } else if (success) {
      await onUpdate();
      // Check if user has any memberships left
      const updatedTeamMemberships = (user.team_memberships || []).filter(
        tm => tm.team_id !== teamMembership.team_id
      );
      if (updatedTeamMemberships.length === 0 && (user.club_memberships || []).length === 0) {
        onClose();
      }
    }
    setProcessing(false);
  }

  async function handleRemoveFromClub(clubMembership) {
    if (!canModifyOwnProfile) {
      alert('You cannot remove yourself from clubs while you are a super admin.');
      return;
    }

    if (!confirm(`Remove ${user.full_name || user.email} from club "${clubMembership.club_name}"?`)) {
      return;
    }

    setProcessing(true);
    const { success, error } = await removeUserFromClub(user.user_id, clubMembership.club_id);

    if (error) {
      alert('Error removing user from club: ' + error.message);
    } else if (success) {
      await onUpdate();
      // Check if user has any memberships left
      const updatedClubMemberships = (user.club_memberships || []).filter(
        cm => cm.club_id !== clubMembership.club_id
      );
      if ((user.team_memberships || []).length === 0 && updatedClubMemberships.length === 0) {
        onClose();
      }
    }
    setProcessing(false);
  }

  async function handleChangeRole(teamMembership, newRole) {
    if (teamMembership.role === newRole) {
      setChangingRole(null);
      return;
    }

    // Prevent super admins from demoting themselves
    if (!canModifyOwnProfile && newRole !== 'super_admin') {
      alert('You cannot change your own role while you are a super admin.');
      setChangingRole(null);
      return;
    }

    setProcessing(true);
    const { success, error } = await updateUserRole(user.user_id, teamMembership.team_id, newRole);

    if (error) {
      alert('Error updating user role: ' + error.message);
    } else if (success) {
      await onUpdate();
      setChangingRole(null);
    }
    setProcessing(false);
  }

  const roleOptions = [
    { value: 'team_staff', label: 'Team Staff' },
    { value: 'club_admin', label: 'Club Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  const roleColors = {
    team_staff: 'bg-green-100 text-green-700',
    club_admin: 'bg-blue-100 text-blue-700',
    super_admin: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">User Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage user memberships and roles</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition"
            disabled={processing}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{user.full_name || 'No name set'}</h3>
              <p className="text-sm text-gray-600 mt-0.5">{user.email}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Joined: {formatDate(user.created_at)}
                </span>
                {user.is_super_admin && (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 font-medium">
                    Super Admin
                  </span>
                )}
              </div>
              {!canModifyOwnProfile && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> You cannot modify your own super admin memberships. To make changes, have another super admin modify your account.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Memberships */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Team Memberships</h3>
            <span className="text-sm text-gray-500">
              {(user.team_memberships || []).length} {(user.team_memberships || []).length === 1 ? 'team' : 'teams'}
            </span>
          </div>

          {(user.team_memberships || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
              <p>Not a member of any teams</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.team_memberships.map((tm) => (
                <div
                  key={tm.team_id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">{tm.team_name}</p>
                        {changingRole === tm.team_id ? (
                          <select
                            value={tm.role}
                            onChange={(e) => handleChangeRole(tm, e.target.value)}
                            disabled={processing}
                            className="px-2 py-0.5 rounded-lg text-xs font-medium border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                          >
                            {roleOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${roleColors[tm.role]}`}>
                            {tm.role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {tm.club_name && (
                        <p className="text-xs text-gray-600 mb-2">
                          Organization: {tm.club_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Joined: {formatDate(tm.joined_at)}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {changingRole === tm.team_id ? (
                        <button
                          onClick={() => setChangingRole(null)}
                          disabled={processing}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition text-xs"
                          title="Cancel"
                        >
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setChangingRole(tm.team_id)}
                            disabled={processing || !canModifyOwnProfile}
                            className={`p-1.5 rounded-lg transition ${
                              !canModifyOwnProfile
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={!canModifyOwnProfile ? "Cannot modify your own super admin role" : "Change Role"}
                          >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoveFromTeam(tm)}
                            disabled={processing || !canModifyOwnProfile}
                            className={`p-1.5 rounded-lg transition ${
                              !canModifyOwnProfile
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={!canModifyOwnProfile ? "Cannot remove yourself as super admin" : "Remove from Team"}
                          >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Club Memberships */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Club Memberships</h3>
            <span className="text-sm text-gray-500">
              {(user.club_memberships || []).length} {(user.club_memberships || []).length === 1 ? 'club' : 'clubs'}
            </span>
          </div>

          {(user.club_memberships || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <p>Not a member of any clubs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user.club_memberships.map((cm) => (
                <div
                  key={cm.club_id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">{cm.club_name}</p>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${roleColors[cm.role]}`}>
                          {cm.role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Joined: {formatDate(cm.joined_at)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveFromClub(cm)}
                      disabled={processing || !canModifyOwnProfile}
                      className={`p-1.5 rounded-lg transition shrink-0 ${
                        !canModifyOwnProfile
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title={!canModifyOwnProfile ? "Cannot remove yourself as super admin" : "Remove from Club"}
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
