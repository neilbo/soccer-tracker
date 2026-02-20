import { createContext, useContext } from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';

const OfflineSyncContext = createContext(null);

export function OfflineSyncProvider({ children }) {
  const offlineSync = useOfflineSync();

  return (
    <OfflineSyncContext.Provider value={offlineSync}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSyncContext must be used within OfflineSyncProvider');
  }
  return context;
}
