import { useState, useEffect } from 'react';
import { getAllUsers } from '../../supabaseClient';
import { UserDetailsModal } from './UserDetailsModal';

export function UserManagementView() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, roleFilter]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    const { users: data, error: err } = await getAllUsers();

    if (err) {
      setError(err.message);
    } else {
      setUsers(data);
    }
    setLoading(false);
  }

  function applyFilters() {
    let filtered = [...users];

    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'super_admin') {
        filtered = filtered.filter(user => user.is_super_admin);
      } else {
        filtered = filtered.filter(user => {
          const teamMemberships = user.team_memberships || [];
          return teamMemberships.some(tm => tm.role === roleFilter);
        });
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query)
      );
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredUsers(filtered);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getTeamNames(user) {
    const teamMemberships = user.team_memberships || [];
    if (teamMemberships.length === 0) return 'No teams';
    return teamMemberships.map(tm => tm.team_name).join(', ');
  }

  function getClubNames(user) {
    const clubMemberships = user.club_memberships || [];
    if (clubMemberships.length === 0) return 'No clubs';
    return clubMemberships.map(cm => cm.club_name).join(', ');
  }

  function getRoleBadges(user) {
    const badges = [];
    if (user.is_super_admin) {
      badges.push({ label: 'Super Admin', color: 'purple' });
    }

    const teamMemberships = user.team_memberships || [];
    const roles = [...new Set(teamMemberships.map(tm => tm.role))];

    roles.forEach(role => {
      if (role === 'club_admin') {
        badges.push({ label: 'Club Admin', color: 'blue' });
      } else if (role === 'team_staff') {
        badges.push({ label: 'Team Staff', color: 'green' });
      }
    });

    return badges;
  }

  const colorClasses = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-600 font-medium">Error loading users</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={loadUsers}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </p>
          </div>
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Email or name..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="club_admin">Club Admin</option>
                <option value="team_staff">Team Staff</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">All Users</h3>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
              <p className="mt-2">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const roleBadges = getRoleBadges(user);
                const teamNames = getTeamNames(user);
                const clubNames = getClubNames(user);

                return (
                  <div
                    key={user.user_id}
                    onClick={() => setSelectedUser(user)}
                    className="p-4 hover:bg-gray-50 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.full_name || user.email}
                          </p>
                          {roleBadges.map((badge, idx) => (
                            <span
                              key={idx}
                              className={`px-2 py-0.5 rounded-lg text-xs font-medium ${colorClasses[badge.color]}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>

                        {user.full_name && (
                          <p className="text-xs text-gray-600 mb-1">{user.email}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
                            </svg>
                            <span className="truncate">{teamNames}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            <span className="truncate">{clubNames}</span>
                          </span>
                          <span className="whitespace-nowrap">Joined: {formatDate(user.created_at)}</span>
                        </div>
                      </div>

                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={loadUsers}
        />
      )}
    </>
  );
}
