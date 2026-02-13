import { useState, useRef, useEffect } from 'react';
import { useAuth, usePermissions } from '../../hooks/useAuth';

export function UserMenu() {
  const { user, signOut, isSuperAdmin } = useAuth();
  const { role, isReadOnly } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Get full name from user metadata
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await signOut();
    setIsOpen(false);
  }

  if (!user) {
    return null;
  }

  const getRoleBadge = () => {
    if (isSuperAdmin) return { text: 'Super Admin', color: 'bg-purple-100 text-purple-700' };
    if (role === 'club_admin') return { text: 'Club Admin', color: 'bg-amber-100 text-amber-700' };
    if (role === 'team_staff') return { text: 'Team Staff', color: 'bg-blue-100 text-blue-700' };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm shrink-0">
            {fullName[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700 truncate">{fullName}</span>
        </div>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
          {/* User Info */}
          <div className="p-4 border-b border-gray-100">
            <div className="font-semibold text-gray-900 truncate">
              {fullName}
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {user.email}
            </div>
            {roleBadge && (
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${roleBadge.color}`}>
                  {roleBadge.text}
                </span>
              </div>
            )}
            {isReadOnly && (
              <div className="mt-2 text-xs text-amber-600 font-medium">
                Read-only access
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-2"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
