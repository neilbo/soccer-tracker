import { useState, useEffect } from 'react';
import { getSystemStats } from '../../supabaseClient';

export function SystemStatsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError(null);
    const { stats: data, error: err } = await getSystemStats();

    if (err) {
      setError(err.message);
    } else {
      setStats(data);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-600 font-medium">Error loading statistics</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total_users || 0,
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      color: 'blue',
    },
    {
      label: 'Super Admins',
      value: stats?.super_admins || 0,
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      color: 'purple',
    },
    {
      label: 'Total Teams',
      value: stats?.total_teams || 0,
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      ),
      color: 'green',
    },
    {
      label: 'Total Organizations',
      value: stats?.total_clubs || 0,
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      color: 'orange',
    },
    {
      label: 'Total Matches',
      value: stats?.total_matches || 0,
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0010 10" />
        </svg>
      ),
      color: 'indigo',
    },
    {
      label: 'Active Matches',
      value: stats?.active_matches || 0,
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
      color: 'emerald',
    },
    {
      label: 'Completed Matches',
      value: stats?.completed_matches || 0,
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      color: 'gray',
    },
    {
      label: 'Pending Invitations',
      value: (stats?.pending_team_invitations || 0) + (stats?.pending_club_invitations || 0),
      icon: (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      color: 'yellow',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Last updated: {stats?.last_updated ? new Date(stats.last_updated).toLocaleString() : 'N/A'}
          </p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl ${colorClasses[card.color]}`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Invitation Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600 font-medium uppercase">Total Invitations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_invitations || 0}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600 font-medium uppercase">Team Invitations</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats?.pending_team_invitations || 0}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-xs text-purple-600 font-medium uppercase">Club Invitations</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{stats?.pending_club_invitations || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
