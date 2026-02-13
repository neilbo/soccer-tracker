import { useState, useEffect } from 'react';
import {
  getAllInvitations,
  getAllTeams,
  getAllClubs,
  createInvitation,
  createClubInvitation,
} from '../../supabaseClient';

export function InvitationManagementView() {
  const [invitations, setInvitations] = useState([]);
  const [filteredInvitations, setFilteredInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Send invitation form state
  const [teams, setTeams] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [invitationType, setInvitationType] = useState('team');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('team_staff');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    loadInvitations();
    loadTeamsAndClubs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invitations, typeFilter, statusFilter, searchQuery]);

  async function loadInvitations() {
    setLoading(true);
    setError(null);
    const { invitations: data, error: err } = await getAllInvitations();

    if (err) {
      setError(err.message);
    } else {
      setInvitations(data);
    }
    setLoading(false);
  }

  async function loadTeamsAndClubs() {
    const [teamsResult, clubsResult] = await Promise.all([
      getAllTeams(),
      getAllClubs()
    ]);

    if (!teamsResult.error) {
      setTeams(teamsResult.teams);
      if (teamsResult.teams.length > 0) {
        setSelectedTeamId(teamsResult.teams[0].id);
      }
    }

    if (!clubsResult.error) {
      setClubs(clubsResult.clubs);
      if (clubsResult.clubs.length > 0) {
        setSelectedClubId(clubsResult.clubs[0].id);
      }
    }
  }

  async function handleSendInvitation(e) {
    e.preventDefault();
    setSendError('');
    setSending(true);

    // Validate email
    if (!email.trim() || !email.includes('@')) {
      setSendError('Please enter a valid email address');
      setSending(false);
      return;
    }

    let result;
    if (invitationType === 'team') {
      if (!selectedTeamId) {
        setSendError('Please select a team');
        setSending(false);
        return;
      }
      result = await createInvitation(selectedTeamId, email.trim().toLowerCase(), role);
    } else {
      if (!selectedClubId) {
        setSendError('Please select an organization');
        setSending(false);
        return;
      }
      result = await createClubInvitation(selectedClubId, email.trim().toLowerCase(), role);
    }

    if (result.error) {
      if (result.error.message?.includes('duplicate')) {
        setSendError('An invitation has already been sent to this email');
      } else {
        setSendError(result.error.message || 'Failed to send invitation');
      }
      setSending(false);
      return;
    }

    // Success
    setEmail('');
    setRole('team_staff');
    await loadInvitations();
    setSending(false);
  }

  function applyFilters() {
    let filtered = [...invitations];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(inv => inv.invitation_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invitee_email?.toLowerCase().includes(query) ||
        inv.inviter_name?.toLowerCase().includes(query) ||
        inv.team_name?.toLowerCase().includes(query) ||
        inv.club_name?.toLowerCase().includes(query)
      );
    }

    setFilteredInvitations(filtered);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  const stats = {
    total: invitations.length,
    pending: invitations.filter(inv => inv.status === 'pending').length,
    team: invitations.filter(inv => inv.invitation_type === 'team').length,
    club: invitations.filter(inv => inv.invitation_type === 'club').length,
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-700',
  };

  const typeColors = {
    team: 'bg-blue-100 text-blue-700',
    club: 'bg-purple-100 text-purple-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading invitations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-600 font-medium">Error loading invitations</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={loadInvitations}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invitation Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">System-wide invitation overview</p>
        </div>
        <button
          onClick={loadInvitations}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Send Invitation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Send Invitation</h3>
        <form onSubmit={handleSendInvitation} className="space-y-4">
          {sendError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{sendError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invitation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Type
              </label>
              <select
                value={invitationType}
                onChange={(e) => setInvitationType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                disabled={sending}
              >
                <option value="team">Team Invitation</option>
                <option value="club">Club/Organization Invitation</option>
              </select>
            </div>

            {/* Team or Club Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {invitationType === 'team' ? 'Select Team' : 'Select Organization'}
              </label>
              {invitationType === 'team' ? (
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                  disabled={sending}
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.title} {team.club_name ? `(${team.club_name})` : ''}
                    </option>
                  ))}
                  {teams.length === 0 && <option value="">No teams available</option>}
                </select>
              ) : (
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                  disabled={sending}
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                  {clubs.length === 0 && <option value="">No organizations available</option>}
                </select>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                disabled={sending}
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
                disabled={sending}
              >
                <option value="team_staff">Team Staff (Full Access)</option>
                <option value="club_admin">Club Admin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || (invitationType === 'team' && teams.length === 0) || (invitationType === 'club' && clubs.length === 0)}
            className="w-full px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </div>

      {/* Invitation Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Invitation Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 font-medium uppercase">Total Invitations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600 font-medium uppercase">Team Invitations</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.team}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-xs text-purple-600 font-medium uppercase">Club Invitations</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{stats.club}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Email, name, team, club..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
            >
              <option value="all">All Types</option>
              <option value="team">Team</option>
              <option value="club">Club</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invitations List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            {filteredInvitations.length} {filteredInvitations.length === 1 ? 'Invitation' : 'Invitations'}
          </h3>
        </div>

        {filteredInvitations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="mt-2">No invitations found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredInvitations.map((inv) => {
              const expired = isExpired(inv.expires_at);
              const displayStatus = expired && inv.status === 'pending' ? 'expired' : inv.status;

              return (
                <div key={inv.invitation_id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${typeColors[inv.invitation_type]}`}>
                          {inv.invitation_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusColors[displayStatus]}`}>
                          {displayStatus}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                          {inv.role}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-gray-900 truncate">{inv.invitee_email}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                        {inv.team_name && (
                          <span className="flex items-center gap-1">
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
                            </svg>
                            {inv.team_name}
                          </span>
                        )}
                        {inv.club_name && (
                          <span className="flex items-center gap-1">
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            {inv.club_name}
                          </span>
                        )}
                        <span>By: {inv.inviter_name || inv.inviter_email}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>Created: {formatDate(inv.created_at)}</span>
                        {inv.expires_at && (
                          <span className={expired ? 'text-red-600 font-medium' : ''}>
                            Expires: {formatDate(inv.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
