# Offline Mode Guide

## Overview

The soccer tracker now supports **offline-first functionality**, allowing users to continue using the app without an internet connection and automatically sync changes when connectivity is restored.

## How It Works

### 1. **Automatic Detection**
- The app automatically detects when you go offline or come back online
- Works with WiFi, cellular, or airplane mode changes

### 2. **Queued Syncing**
- When offline, all changes are saved locally (localStorage)
- Changes are queued for sync when connectivity returns
- Queue persists across page refreshes

### 3. **Auto-Sync**
- When connection is restored, changes automatically sync to Supabase
- Manual sync button available if needed
- Shows sync progress in real-time

### 4. **Visual Indicators**
- **Blue badge**: Online with pending syncs
- **Yellow/Amber badge**: Offline mode
- **Spinning icon**: Syncing in progress
- **Count badge**: Number of pending changes

## Features

✅ **Works offline** - Continue tracking matches without internet
✅ **Auto-save** - Changes saved to localStorage every 500ms
✅ **Auto-sync** - Syncs when connection restored
✅ **Manual sync** - Click "Sync Now" button anytime
✅ **Persistent queue** - Syncs survive page refreshes
✅ **Smart syncing** - Skips admin pages (Users, Organizations, Invitations)

## User Experience

### When You Go Offline:
1. **Indicator appears** - Yellow badge in bottom-right corner
2. **Shows "Offline Mode"** - Clear status message
3. **Continue working** - All features work normally
4. **Changes queued** - Pending count shown on badge

### When Connection Returns:
1. **Auto-sync starts** - Happens within 1 second
2. **Progress shown** - Spinning icon during sync
3. **Success indication** - Shows "Last sync: just now"
4. **Badge disappears** - When all synced

### Manual Sync:
- Click the **"Sync Now"** button on the indicator
- Available when online with pending changes
- Shows sync results in console

## Testing Offline Mode

### Method 1: Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Change throttling to **"Offline"**
4. Make changes in the app
5. Switch back to **"Online"**
6. Watch auto-sync happen

### Method 2: Airplane Mode
1. Enable airplane mode on your device
2. Make changes in the app
3. Disable airplane mode
4. Changes sync automatically

### Method 3: Disconnect WiFi
1. Disconnect from WiFi
2. Make changes
3. Reconnect to WiFi
4. Auto-sync occurs

## Technical Details

### Architecture

```
┌─────────────────────────────────────────┐
│        User Makes Change                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     Check: Are we online?               │
└─────────┬───────────────────┬───────────┘
          │                   │
    ONLINE│              OFFLINE│
          ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│  Save directly   │  │  Queue for sync  │
│  to Supabase     │  │  (localStorage)  │
└──────────────────┘  └─────────┬────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  Connection restored │
                      └─────────┬────────────┘
                                │
                                ▼
                      ┌──────────────────────┐
                      │  Process sync queue  │
                      │  Save all to Supabase│
                      └──────────────────────┘
```

### Files Added

- `src/hooks/useOfflineSync.jsx` - Offline sync hook
- `src/contexts/OfflineSyncContext.jsx` - Context provider
- `src/components/OfflineIndicator.jsx` - UI component
- `docs/OFFLINE_MODE.md` - This guide

### Files Modified

- `src/main.jsx` - Added OfflineSyncProvider
- `src/App.jsx` - Integrated offline sync logic

### Storage

**localStorage:**
- `offline_sync_queue` - Array of pending changes
- `last_sync_time` - Timestamp of last successful sync
- `appState` - App state (already existed)

**sessionStorage:**
- `pending_invitation_token` - Invitation tokens (already existed)

## Limitations

1. **Authentication Required**
   - Must be signed in to use offline mode
   - Guest mode works offline (local only)

2. **No Partial Syncs**
   - Entire app state syncs, not individual changes
   - Efficient but syncs everything

3. **Last Write Wins**
   - If changed on multiple devices offline, last sync wins
   - No conflict resolution (yet)

4. **Admin Pages Don't Sync**
   - Users, Organizations, Invitations pages don't queue changes
   - These require real-time server data

## Future Enhancements

### Phase 2 Possibilities:
- **Service Workers** - Cache app shell for instant loading
- **Background Sync** - Sync even when app is closed
- **Conflict Resolution** - Handle simultaneous edits
- **Differential Sync** - Only sync changed data
- **PWA Support** - Install as mobile app
- **Offline Match Creation** - Start matches without connection

## Troubleshooting

### Sync Not Working?
1. Check console for errors
2. Verify you're authenticated
3. Ensure you're not on an admin page
4. Try manual sync button
5. Check localStorage size (quota limits)

### Queue Growing Too Large?
- Clear queue: `localStorage.removeItem('offline_sync_queue')`
- Refresh page to restart sync
- Contact support if persistent

### Data Not Syncing?
1. Check network connection
2. Verify Supabase is online
3. Check browser console for errors
4. Try signing out and back in

## Support

For issues or questions:
- Check browser console for error messages
- Verify network connectivity
- Try clearing localStorage and re-syncing
- Report bugs with console errors attached
