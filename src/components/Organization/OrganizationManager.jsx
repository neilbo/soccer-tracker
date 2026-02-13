import { useState, useEffect } from 'react';
import {
  getAllClubs,
  createClub,
  updateClub,
  deleteClub,
} from '../../supabaseClient';

export function OrganizationManager() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    setLoading(true);
    const { clubs, error } = await getAllClubs();
    if (!error) {
      setOrganizations(clubs);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;

    setCreating(true);
    const { club, error } = await createClub(newName.trim());

    if (error) {
      alert('Error creating organization: ' + error.message);
    } else {
      setOrganizations([...organizations, club].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    }
    setCreating(false);
  }

  async function handleUpdate(clubId, newName) {
    if (!newName.trim()) return;

    const { club, error } = await updateClub(clubId, newName.trim());

    if (error) {
      alert('Error updating organization: ' + error.message);
    } else {
      setOrganizations(organizations.map(org =>
        org.id === clubId ? club : org
      ).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
    }
  }

  async function handleDelete(clubId, clubName) {
    if (!confirm(`Are you sure you want to delete "${clubName}"? This will remove all teams under this organization.`)) {
      return;
    }

    const { success, error } = await deleteClub(clubId);

    if (error) {
      alert('Error deleting organization: ' + error.message);
    } else if (success) {
      setOrganizations(organizations.filter(org => org.id !== clubId));
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <span className="text-sm text-gray-500 font-medium">
          {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'}
        </span>
      </div>

      {/* Create Organization */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add New Organization
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Organization name (e.g., City FC)"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            disabled={creating}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Organizations List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Manage Organizations</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Organizations can contain multiple teams
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {organizations.map((org, index) => (
            <div key={org.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
              <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>

              {editingId === org.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue.trim() && editValue !== org.name) {
                      handleUpdate(org.id, editValue);
                    } else {
                      setEditingId(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdate(org.id, editValue);
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                  className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 outline-none text-sm"
                />
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                    {org.name}
                  </span>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(org.id);
                        setEditValue(org.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Edit"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(org.id, org.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {organizations.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <p className="mt-2">No organizations yet. Add one above!</p>
          </div>
        )}
      </div>
    </div>
  );
}
