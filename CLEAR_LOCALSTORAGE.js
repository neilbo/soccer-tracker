// Run this in browser console to clear old localStorage data
// This fixes issues with legacy numeric team IDs

// Clear old team ID if it's not a UUID
const oldTeamId = localStorage.getItem('currentTeamId');
if (oldTeamId && !oldTeamId.includes('-')) {
  console.log('Clearing legacy team ID:', oldTeamId);
  localStorage.removeItem('currentTeamId');
  console.log('Cleared! Please refresh the page.');
} else {
  console.log('No legacy team ID found. Current team ID:', oldTeamId);
}

// Optionally clear all localStorage (use with caution!)
// localStorage.clear();
// console.log('All localStorage cleared!');
