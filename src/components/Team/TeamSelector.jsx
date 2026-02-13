import { useState, useRef, useEffect } from 'react';
import { useAuth, usePermissions } from '../../hooks/useAuth';
import { InvitationManager } from './InvitationManager';

export function TeamSelector() {
  const { currentTeam, teams, selectTeam, createNewTeam, userClubs } = useAuth();
  const { canEdit } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setCreating(true);
    const clubId = selectedClubId || null;
    const { error } = await createNewTeam(newTeamName.trim(), clubId);

    if (error) {
      alert('Error creating team: ' + error.message);
    } else {
      setNewTeamName('');
      setSelectedClubId('');
      setShowCreateForm(false);
      setIsOpen(false);
    }
    setCreating(false);
  }

  if (!currentTeam) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Team Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition text-sm font-medium text-gray-700"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="max-w-[150px] truncate">{currentTeam.team_title}</span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
          {!showCreateForm ? (
            <>
              {/* Team List */}
              <div className="max-h-64 overflow-y-auto">
                {teams.map((team) => (
                  <button
                    key={team.team_id}
                    onClick={() => {
                      selectTeam(team.team_id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between ${
                      currentTeam.team_id === team.team_id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {team.team_title}
                      </div>
                      {team.club_name && (
                        <div className="text-xs text-gray-500 truncate">
                          {team.club_name}
                        </div>
                      )}
                    </div>
                    {currentTeam.team_id === team.team_id && (
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-blue-600">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-100 p-2 space-y-1">
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowInvitations(true);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12.5 11a4 4 0 100-8 4 4 0 000 8zM16 11h6M19 8v6" />
                    </svg>
                    Invite Members
                  </button>
                )}
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Team
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Create Team Form */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Create New Team</h3>
                <form onSubmit={handleCreateTeam} className="space-y-3">
                  <div>
                    <label htmlFor="teamName" className="block text-xs font-medium text-gray-700 mb-1">
                      Team Name
                    </label>
                    <input
                      id="teamName"
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team name (e.g., U10 Academy)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                      disabled={creating}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="clubSelect" className="block text-xs font-medium text-gray-700 mb-1">
                      Club (optional)
                    </label>
                    <select
                      id="clubSelect"
                      value={selectedClubId}
                      onChange={(e) => setSelectedClubId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                      disabled={creating}
                    >
                      <option value="">Independent Team</option>
                      {userClubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {userClubs.length === 0
                        ? 'You are not a member of any clubs yet'
                        : 'Select a club or leave as independent'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTeamName('');
                        setSelectedClubId('');
                      }}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                      disabled={creating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-40"
                      disabled={creating || !newTeamName.trim()}
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Invitation Manager Modal */}
      {showInvitations && currentTeam && (
        <InvitationManager
          teamId={currentTeam.team_id}
          onClose={() => setShowInvitations(false)}
        />
      )}
    </div>
  );
}
