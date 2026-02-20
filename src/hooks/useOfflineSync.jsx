import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing offline/online state and sync queue
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const syncQueueRef = useRef([]);

  // Load sync queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('offline_sync_queue');
    if (savedQueue) {
      try {
        const queue = JSON.parse(savedQueue);
        setSyncQueue(queue);
        syncQueueRef.current = queue;
      } catch (e) {
        console.error('Failed to load sync queue:', e);
      }
    }

    const lastSync = localStorage.getItem('last_sync_time');
    if (lastSync) {
      setLastSyncTime(new Date(lastSync));
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    function handleOnline() {
      console.log('🟢 Connection restored');
      setIsOnline(true);
    }

    function handleOffline() {
      console.log('🔴 Connection lost');
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save sync queue to localStorage whenever it changes
  useEffect(() => {
    if (syncQueue.length > 0) {
      localStorage.setItem('offline_sync_queue', JSON.stringify(syncQueue));
    } else {
      localStorage.removeItem('offline_sync_queue');
    }
  }, [syncQueue]);

  /**
   * Add an item to the sync queue
   */
  const queueSync = useCallback((syncItem) => {
    const item = {
      id: Date.now() + Math.random(), // Unique ID
      timestamp: new Date().toISOString(),
      ...syncItem,
    };

    setSyncQueue(prev => {
      const updated = [...prev, item];
      syncQueueRef.current = updated;
      return updated;
    });

    console.log('📝 Queued for sync:', item);
  }, []);

  /**
   * Process the sync queue
   */
  const processSyncQueue = useCallback(async (syncFunction) => {
    if (!isOnline || isSyncing || syncQueue.length === 0) {
      return { success: false, reason: !isOnline ? 'offline' : isSyncing ? 'already_syncing' : 'queue_empty' };
    }

    setIsSyncing(true);
    console.log(`🔄 Syncing ${syncQueue.length} items...`);

    const results = {
      total: syncQueue.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    // Process each item in queue
    for (const item of syncQueue) {
      try {
        await syncFunction(item);
        results.succeeded++;
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        results.failed++;
        results.errors.push({ item, error: error.message });
      }
    }

    // Clear successfully synced items
    if (results.succeeded > 0) {
      setSyncQueue(prev => {
        // Keep only failed items
        const failedItems = results.errors.map(e => e.item);
        const updated = prev.filter(item =>
          failedItems.some(failed => failed.id === item.id)
        );
        syncQueueRef.current = updated;
        return updated;
      });
    }

    const now = new Date();
    setLastSyncTime(now);
    localStorage.setItem('last_sync_time', now.toISOString());
    setIsSyncing(false);

    console.log(`✅ Sync complete: ${results.succeeded} succeeded, ${results.failed} failed`);

    return { success: true, results };
  }, [isOnline, isSyncing, syncQueue]);

  /**
   * Clear the sync queue (use with caution)
   */
  const clearSyncQueue = useCallback(() => {
    setSyncQueue([]);
    syncQueueRef.current = [];
    localStorage.removeItem('offline_sync_queue');
    console.log('🗑️ Sync queue cleared');
  }, []);

  /**
   * Get pending sync count
   */
  const pendingCount = syncQueue.length;

  return {
    isOnline,
    isSyncing,
    syncQueue,
    pendingCount,
    lastSyncTime,
    queueSync,
    processSyncQueue,
    clearSyncQueue,
  };
}
