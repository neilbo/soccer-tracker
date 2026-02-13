import { useState, useEffect } from 'react';
import { getAllInvitations } from '../../supabaseClient';

export function InvitationManagementView() {
  const [invitations, setInvitations] = useState([]);
  const [filteredInvitations, setFilteredInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInvitations();
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-600 font-medium uppercase">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <p className="text-xs text-yellow-700 font-medium uppercase">Pending</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-700 font-medium uppercase">Team</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.team}</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <p className="text-xs text-purple-700 font-medium uppercase">Club</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{stats.club}</p>
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
