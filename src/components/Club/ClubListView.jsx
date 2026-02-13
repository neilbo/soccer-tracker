import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ClubInvitationManager } from './ClubInvitationManager';
import { CreateClubModal } from './CreateClubModal';

export function ClubListView() {
  const { userClubs, isSuperAdmin, loadUserClubs } = useAuth();
  const [selectedClub, setSelectedClub] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  function handleCloseInvitations() {
    setSelectedClub(null);
  }

  function handleClubCreated() {
    loadUserClubs();
    setShowCreateModal(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Clubs</h2>
        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Create Club
          </button>
        )}
      </div>

      {/* Clubs List */}
      {userClubs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clubs Yet</h3>
          <p className="text-gray-600 text-sm mb-4">
            You're not a member of any clubs. Wait for an invitation from a club admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {userClubs.map((club) => (
            <div
              key={club.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{club.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {club.role === 'club_admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {club.role === 'club_admin' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setSelectedClub(club)}
                    className="flex-1 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition"
                  >
                    Invite Members
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Club Invitation Manager Modal */}
      {selectedClub && (
        <ClubInvitationManager
          clubId={selectedClub.id}
          clubName={selectedClub.name}
          onClose={handleCloseInvitations}
        />
      )}

      {/* Create Club Modal */}
      {showCreateModal && (
        <CreateClubModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleClubCreated}
        />
      )}
    </div>
  );
}
