import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineIndicator({ onSyncClick, alwaysShow = false }) {
  const { isOnline, isSyncing, pendingCount, lastSyncTime } = useOfflineSync();

  // Show indicator when: offline, syncing, has pending changes, or alwaysShow is true
  const shouldShow = !isOnline || isSyncing || pendingCount > 0 || alwaysShow;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`rounded-xl shadow-lg border-2 px-4 py-3 flex items-center gap-3 ${
          isOnline
            ? 'bg-blue-50 border-blue-200'
            : 'bg-amber-50 border-amber-300'
        }`}
      >
        {/* Status Icon */}
        <div className="relative">
          {isOnline ? (
            isSyncing ? (
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-600 animate-spin"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-600"
              >
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            )
          ) : (
            <>
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-amber-600"
              >
                <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39m7.6 2.39a10.94 10.94 0 01-5.17 2.39M9 16a5 5 0 011.17-.42m4.06 0A5 5 0 0115 16" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </>
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isOnline ? 'text-blue-900' : 'text-amber-900'}`}>
            {isOnline ? (
              isSyncing ? (
                'Syncing...'
              ) : pendingCount > 0 ? (
                `${pendingCount} change${pendingCount === 1 ? '' : 's'} to sync`
              ) : (
                'Online & Synced'
              )
            ) : (
              'Offline Mode'
            )}
          </p>
          {lastSyncTime && isOnline && !isSyncing && (
            <p className="text-xs text-gray-600">
              Last sync: {formatTimeAgo(lastSyncTime)}
            </p>
          )}
          {!isOnline && pendingCount > 0 && (
            <p className="text-xs text-amber-700">
              {pendingCount} pending change{pendingCount === 1 ? '' : 's'}
            </p>
          )}
          {!isOnline && pendingCount === 0 && (
            <p className="text-xs text-amber-700">
              Changes will sync when online
            </p>
          )}
        </div>

        {/* Sync Button */}
        {isOnline && pendingCount > 0 && !isSyncing && (
          <button
            onClick={onSyncClick}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Sync Now
          </button>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
