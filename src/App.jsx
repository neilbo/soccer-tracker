import { useState, useEffect, useReducer, useRef } from "react";
import "./App.css";

const DEFAULT_PLAYERS = [
  "Apaarwar", "Ethan", "Jaibir (JB)", "Jacob", "Jake", "Liam",
  "Nash", "Ronnie", "Ruben", "Tyler", "Viraaj", "Zully"
];

const TEAM_NAME = "North Star FC";
const STORAGE_KEY = "soccer-tracker-data";

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

// --- Storage ---

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load state:", e);
  }
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        matches: state.matches,
        squad: state.squad,
        nextPlayerId: state.nextPlayerId,
        teamTitle: state.teamTitle,
        currentMatch: state.currentMatch,
      })
    );
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

// --- State ---

const initialState = {
  view: "dashboard",
  matches: [],
  currentMatch: null,
  squad: DEFAULT_PLAYERS.map((name, i) => ({ id: i, name })),
  nextPlayerId: DEFAULT_PLAYERS.length,
  teamTitle: "U10 Academy",
  loaded: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view };
    case "SET_TEAM_TITLE":
      return { ...state, teamTitle: action.title };
    case "LOAD_SAVED":
      return {
        ...state,
        ...action.data,
        loaded: true,
        view: action.data.currentMatch?.status === "live" ? "match" : "dashboard",
      };
    case "ADD_SQUAD_PLAYER":
      return {
        ...state,
        squad: [...state.squad, { id: state.nextPlayerId, name: action.name }],
        nextPlayerId: state.nextPlayerId + 1,
      };
    case "REMOVE_SQUAD_PLAYER":
      return { ...state, squad: state.squad.filter((p) => p.id !== action.playerId) };
    case "RENAME_SQUAD_PLAYER":
      return {
        ...state,
        squad: state.squad.map((p) => (p.id === action.playerId ? { ...p, name: action.name } : p)),
      };
    case "REORDER_SQUAD": {
      const squad = [...state.squad];
      const [moved] = squad.splice(action.fromIndex, 1);
      squad.splice(action.toIndex, 0, moved);
      return { ...state, squad };
    }
    case "CREATE_MATCH": {
      const match = {
        id: Date.now(),
        opponent: action.opponent,
        venue: action.venue,
        date: action.date,
        description: action.description,
        tag: action.tag,
        players: state.squad.map((p, i) => ({
          id: p.id,
          name: p.name,
          seconds: 0,
          running: false,
          starting: i < 11,
          onField: false,
          goals: 0,
          assists: 0,
          notes: "",
          events: [],
        })),
        status: "setup",
        teamGoals: 0,
        opponentGoals: 0,
        matchSeconds: 0,
        matchRunning: false,
      };
      return { ...state, matches: [...state.matches, match], currentMatch: match, view: "setup" };
    }
    case "SET_CURRENT_MATCH":
      return {
        ...state,
        currentMatch: action.match,
        view:
          action.match.status === "live"
            ? "match"
            : "match-edit",
      };
    case "UPDATE_PLAYER_NAME": {
      const match = {
        ...state.currentMatch,
        players: state.currentMatch.players.map((p) =>
          p.id === action.playerId ? { ...p, name: action.name } : p
        ),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "UPDATE_PLAYER_NOTES": {
      const match = {
        ...state.currentMatch,
        players: state.currentMatch.players.map((p) =>
          p.id === action.playerId ? { ...p, notes: action.notes } : p
        ),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "TOGGLE_STARTING": {
      const match = {
        ...state.currentMatch,
        players: state.currentMatch.players.map((p) =>
          p.id === action.playerId ? { ...p, starting: !p.starting } : p
        ),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "START_MATCH": {
      const mt = state.currentMatch.matchSeconds;
      const match = {
        ...state.currentMatch,
        status: "live",
        matchRunning: true,
        players: state.currentMatch.players.map((p) => ({
          ...p,
          running: p.starting,
          onField: p.starting,
          events: p.starting ? [{ type: "on", at: mt }] : [],
        })),
      };
      return {
        ...state,
        currentMatch: match,
        matches: state.matches.map((m) => (m.id === match.id ? match : m)),
        view: "match",
      };
    }
    case "TICK": {
      if (!state.currentMatch || state.currentMatch.status !== "live" || !state.currentMatch.matchRunning)
        return state;
      const match = {
        ...state.currentMatch,
        matchSeconds: state.currentMatch.matchSeconds + 1,
        players: state.currentMatch.players.map((p) => (p.running ? { ...p, seconds: p.seconds + 1 } : p)),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "TOGGLE_MATCH_CLOCK": {
      const match = { ...state.currentMatch, matchRunning: !state.currentMatch.matchRunning };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "TOGGLE_TIMER": {
      const mt = state.currentMatch.matchSeconds;
      const match = {
        ...state.currentMatch,
        players: state.currentMatch.players.map((p) => {
          if (p.id !== action.playerId) return p;
          const nowRunning = !p.running;
          const event = nowRunning ? { type: "on", at: mt } : { type: "off", at: mt };
          return { ...p, running: nowRunning, onField: nowRunning ? true : p.onField, events: [...p.events, event] };
        }),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "SUB_OFF": {
      const mt = state.currentMatch.matchSeconds;
      const match = {
        ...state.currentMatch,
        players: state.currentMatch.players.map((p) =>
          p.id === action.playerId
            ? { ...p, running: false, onField: false, events: [...p.events, { type: "off", at: mt }] }
            : p
        ),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "SUB_ON": {
      const mt = state.currentMatch.matchSeconds;
      const match = {
        ...state.currentMatch,
        players: state.currentMatch.players.map((p) =>
          p.id === action.playerId
            ? { ...p, running: true, onField: true, events: [...p.events, { type: "on", at: mt }] }
            : p
        ),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "UPDATE_STAT": {
      const player = state.currentMatch.players.find((p) => p.id === action.playerId);
      const newVal = Math.max(0, player[action.stat] + action.delta);
      const diff = newVal - player[action.stat];
      let teamGoals = state.currentMatch.teamGoals;
      if (action.stat === "goals") teamGoals = Math.max(0, teamGoals + diff);
      const match = {
        ...state.currentMatch,
        teamGoals,
        players: state.currentMatch.players.map((p) =>
          p.id === action.playerId ? { ...p, [action.stat]: newVal } : p
        ),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "UPDATE_SCORE": {
      const match = {
        ...state.currentMatch,
        [action.field]: Math.max(0, state.currentMatch[action.field] + action.delta),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "END_MATCH": {
      const mt = state.currentMatch.matchSeconds;
      const match = {
        ...state.currentMatch,
        status: "completed",
        matchRunning: false,
        players: state.currentMatch.players.map((p) => {
          const events = p.running ? [...p.events, { type: "off", at: mt }] : p.events;
          return { ...p, running: false, events };
        }),
      };
      return {
        ...state,
        currentMatch: match,
        matches: state.matches.map((m) => (m.id === match.id ? match : m)),
        view: "match-review",
      };
    }
    case "ADD_MATCH_PLAYER": {
      const newId = Math.max(...state.currentMatch.players.map((p) => p.id), 0) + 1;
      const match = {
        ...state.currentMatch,
        players: [
          ...state.currentMatch.players,
          {
            id: newId,
            name: action.name || `Player ${newId + 1}`,
            seconds: 0,
            running: false,
            starting: false,
            onField: false,
            goals: 0,
            assists: 0,
            notes: "",
            events: [],
          },
        ],
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "REMOVE_MATCH_PLAYER": {
      const match = {
        ...state.currentMatch,
        players: state.currentMatch.players.filter((p) => p.id !== action.playerId),
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "UPDATE_MATCH_META": {
      const match = {
        ...state.currentMatch,
        opponent: action.opponent ?? state.currentMatch.opponent,
        venue: action.venue ?? state.currentMatch.venue,
        date: action.date ?? state.currentMatch.date,
        description: action.description ?? state.currentMatch.description,
        tag: action.tag ?? state.currentMatch.tag,
      };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "UPDATE_MATCH_SECONDS": {
      const match = { ...state.currentMatch, matchSeconds: Math.max(0, action.seconds) };
      return { ...state, currentMatch: match, matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
    }
    case "DELETE_MATCH": {
      const matchId = state.currentMatch?.id;
      if (!matchId) return state;
      return {
        ...state,
        matches: state.matches.filter((m) => m.id !== matchId),
        currentMatch: null,
        view: "dashboard",
      };
    }
    default:
      return state;
  }
}

// --- Icons ---

const Icon = ({ name, size = 24 }) => {
  const icons = {
    home: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />,
    play: <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />,
    pause: <path d="M10 9v6m4-6v6" />,
    plus: <path d="M12 4v16m8-8H4" />,
    minus: <path d="M20 12H4" />,
    users: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    clock: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    trophy: <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    back: <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
    stop: <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    chart: <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    x: <path d="M6 18L18 6M6 6l12 12" />,
    check: <path d="M5 13l4 4L19 7" />,
    swap: (
      <>
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </>
    ),
    edit: <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    up: <path d="M5 15l7-7 7 7" />,
    down: <path d="M19 9l-7 7-7-7" />,
    note: <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-7 0l9-9m0 0h-6m6 0v6" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// --- Button ---

const Btn = ({ children, onClick, variant = "default", size = "md", className = "", disabled = false }) => {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none";
  const sizes = {
    xs: "px-3 py-2 text-sm",
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-6 py-3.5 text-lg",
  };
  const variants = {
    default: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm",
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-200",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- Helpers ---

function getPlayerStints(player, matchSeconds) {
  const stints = [];
  let onTime = null;
  for (const e of player.events) {
    if (e.type === "on") onTime = e.at;
    else if (e.type === "off" && onTime !== null) {
      stints.push({ on: onTime, off: e.at });
      onTime = null;
    }
  }
  if (onTime !== null) stints.push({ on: onTime, off: matchSeconds });
  return stints;
}

// --- Export ---

function exportDashboardCSV(state) {
  const completed = state.matches.filter((m) => m.status === "completed");
  let csv = "MATCH SUMMARY\nDate,Opponent,Venue,Tag,Goals For,Goals Against,Result,Match Time (min),Description\n";
  completed.forEach((m) => {
    const result = m.teamGoals > m.opponentGoals ? "Win" : m.teamGoals < m.opponentGoals ? "Loss" : "Draw";
    csv += `${formatDate(m.date)},"${m.opponent}",${m.venue === "home" ? "Home" : "Away"},"${m.tag || ""}",${m.teamGoals},${m.opponentGoals},${result},${Math.round(m.matchSeconds / 60)},"${(m.description || "").replace(/"/g, '""')}"\n`;
  });
  const allPlayers = {};
  completed.forEach((m) => {
    m.players.forEach((p) => {
      if (!allPlayers[p.name])
        allPlayers[p.name] = { name: p.name, totalMinutes: 0, matches: 0, goals: 0, assists: 0 };
      allPlayers[p.name].totalMinutes += Math.round(p.seconds / 60);
      if (p.seconds > 0) allPlayers[p.name].matches++;
      allPlayers[p.name].goals += p.goals;
      allPlayers[p.name].assists += p.assists;
    });
  });
  csv += "\nPLAYER STATS (ALL MATCHES)\nPlayer,Matches Played,Total Minutes,Goals,Assists\n";
  Object.values(allPlayers)
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .forEach((p) => {
      csv += `"${p.name}",${p.matches},${p.totalMinutes},${p.goals},${p.assists}\n`;
    });
  const wins = completed.filter((m) => m.teamGoals > m.opponentGoals).length;
  const draws = completed.filter((m) => m.teamGoals === m.opponentGoals).length;
  const losses = completed.length - wins - draws;
  const gf = completed.reduce((s, m) => s + m.teamGoals, 0);
  const ga = completed.reduce((s, m) => s + m.opponentGoals, 0);
  csv += `\nSEASON SUMMARY\nPlayed,${completed.length}\nWins,${wins}\nDraws,${draws}\nLosses,${losses}\nGoals For,${gf}\nGoals Against,${ga}\nGoal Difference,${gf - ga}\n`;
  downloadCSV(csv, `${state.teamTitle}_Dashboard_${new Date().toISOString().split("T")[0]}.csv`);
}

function exportMatchCSV(match) {
  const result = match.teamGoals > match.opponentGoals ? "Win" : match.teamGoals < match.opponentGoals ? "Loss" : "Draw";
  const sorted = [...match.players].sort((a, b) => b.seconds - a.seconds);
  let csv = `MATCH DETAILS\nOpponent,"${match.opponent}"\nDate,${formatDate(match.date)}\nVenue,${match.venue === "home" ? "Home" : "Away"}\nResult,${result}\nScore,${match.teamGoals} - ${match.opponentGoals}\nTotal Match Time,${formatTime(match.matchSeconds)}\n`;
  if (match.tag) csv += `Tag,"${match.tag}"\n`;
  if (match.description) csv += `Description,"${match.description.replace(/"/g, '""')}"\n`;
  csv += "\nPLAYER STATS\nPlayer,Minutes Played,Minutes Off,Stints (On-Off),Goals,Assists,Notes\n";
  sorted.forEach((p) => {
    const stints = getPlayerStints(p, match.matchSeconds);
    const stintStr = stints.map((s) => `${formatTime(s.on)}-${formatTime(s.off)}`).join("; ");
    const minsOff = Math.round(match.matchSeconds / 60) - Math.round(p.seconds / 60);
    csv += `"${p.name}",${Math.round(p.seconds / 60)},${Math.max(0, minsOff)},"${stintStr}",${p.goals},${p.assists},"${(p.notes || "").replace(/"/g, '""')}"\n`;
  });
  downloadCSV(csv, `Match_vs_${match.opponent}_${formatDate(match.date)}.csv`);
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Squad ---

function SquadView({ state, dispatch }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const startEditing = (p) => { setEditingId(p.id); setEditVal(p.name); };
  const saveEdit = () => { if (editVal.trim()) dispatch({ type: "RENAME_SQUAD_PLAYER", playerId: editingId, name: editVal.trim() }); setEditingId(null); };
  const addPlayer = () => { if (newName.trim()) { dispatch({ type: "ADD_SQUAD_PLAYER", name: newName.trim() }); setNewName(""); } };
  const movePlayer = (index, dir) => {
    const to = index + dir;
    if (to >= 0 && to < state.squad.length) dispatch({ type: "REORDER_SQUAD", fromIndex: index, toIndex: to });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Squad</h1>
        <span className="text-sm text-gray-500 font-medium">{state.squad.length} players</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add new player</label>
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} placeholder="Player name"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
          <Btn variant="primary" size="md" onClick={addPlayer} disabled={!newName.trim()}>Add</Btn>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Manage Players</h2>
          <p className="text-xs text-gray-500 mt-0.5">These players will be used when creating new matches</p>
        </div>
        <div className="divide-y divide-gray-100">
          {state.squad.map((p, index) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
              <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
              {editingId === p.id ? (
                <input value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus
                  className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 outline-none text-sm" />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-800">{p.name}</span>
              )}
              <div className="flex items-center gap-1">
                <button onClick={() => movePlayer(index, -1)} disabled={index === 0} className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 transition"><Icon name="up" size={16} /></button>
                <button onClick={() => movePlayer(index, 1)} disabled={index === state.squad.length - 1} className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-20 transition"><Icon name="down" size={16} /></button>
                <button onClick={() => startEditing(p)} className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"><Icon name="edit" size={16} /></button>
                <button onClick={() => dispatch({ type: "REMOVE_SQUAD_PLAYER", playerId: p.id })} className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition"><Icon name="x" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        {state.squad.length === 0 && (
          <div className="p-8 text-center text-gray-400"><Icon name="users" size={40} /><p className="mt-2">No players in squad. Add some above!</p></div>
        )}
      </div>
    </div>
  );
}

// --- Dashboard ---

function Dashboard({ state, dispatch }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(state.teamTitle);
  const matches = [...state.matches].reverse();
  const completed = matches.filter((m) => m.status === "completed");
  const totalMatches = completed.length;
  const wins = completed.filter((m) => m.teamGoals > m.opponentGoals).length;
  const draws = completed.filter((m) => m.teamGoals === m.opponentGoals).length;
  const losses = totalMatches - wins - draws;
  const goalsFor = completed.reduce((s, m) => s + m.teamGoals, 0);
  const goalsAgainst = completed.reduce((s, m) => s + m.opponentGoals, 0);
  const allPlayers = {};
  completed.forEach((m) => {
    m.players.forEach((p) => {
      if (!allPlayers[p.name]) allPlayers[p.name] = { name: p.name, totalMinutes: 0, matches: 0, goals: 0, assists: 0 };
      allPlayers[p.name].totalMinutes += Math.round(p.seconds / 60);
      if (p.seconds > 0) allPlayers[p.name].matches++;
      allPlayers[p.name].goals += p.goals;
      allPlayers[p.name].assists += p.assists;
    });
  });
  const playerStats = Object.values(allPlayers).sort((a, b) => b.totalMinutes - a.totalMinutes);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} autoFocus
              onBlur={() => { if (titleVal.trim()) dispatch({ type: "SET_TEAM_TITLE", title: titleVal.trim() }); setEditingTitle(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { if (titleVal.trim()) dispatch({ type: "SET_TEAM_TITLE", title: titleVal.trim() }); setEditingTitle(false); } }}
              className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 outline-none w-48" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition" onClick={() => { setTitleVal(state.teamTitle); setEditingTitle(true); }}>{state.teamTitle}</h1>
          )}
          {!editingTitle && <button onClick={() => { setTitleVal(state.teamTitle); setEditingTitle(true); }} className="text-gray-400 hover:text-gray-600 transition"><Icon name="edit" size={16} /></button>}
        </div>
        <div className="flex items-center gap-2">
          {matches.length > 0 && <Btn variant="default" onClick={() => exportDashboardCSV(state)}>Export</Btn>}
          <Btn variant="primary" onClick={() => dispatch({ type: "SET_VIEW", view: "new-match" })}>New Match</Btn>
        </div>
      </div>
      {totalMatches > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Played", value: totalMatches, color: "bg-gray-100 text-gray-800" },
            { label: "Wins", value: wins, color: "bg-emerald-50 text-emerald-700" },
            { label: "Draws", value: draws, color: "bg-amber-50 text-amber-700" },
            { label: "Losses", value: losses, color: "bg-red-50 text-red-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-2xl p-4 text-center`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs font-medium opacity-70 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {totalMatches > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Goals For: <strong className="text-gray-900">{goalsFor}</strong></span>
            <span>Goals Against: <strong className="text-gray-900">{goalsAgainst}</strong></span>
            <span>GD: <strong className={goalsFor - goalsAgainst >= 0 ? "text-emerald-600" : "text-red-600"}>{goalsFor - goalsAgainst >= 0 ? "+" : ""}{goalsFor - goalsAgainst}</strong></span>
          </div>
        </div>
      )}
      {playerStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Icon name="chart" size={16} />Player Stats (All Matches)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Player</th><th className="p-3 text-center">MP</th><th className="p-3 text-center">Mins</th><th className="p-3 text-center">⚽</th><th className="p-3 text-center">🅰️</th>
              </tr></thead>
              <tbody>{playerStats.map((p) => (
                <tr key={p.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-center">{p.matches}</td>
                  <td className="p-3 text-center">{p.totalMinutes}</td>
                  <td className="p-3 text-center">{p.goals}</td>
                  <td className="p-3 text-center">{p.assists}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Icon name="trophy" size={16} />Matches</h2>
        {matches.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-gray-400"><Icon name="trophy" size={48} /><p className="mt-3 text-center">No matches yet. Create your first match!</p></div>}
        {matches.map((m) => {
          const result = m.status === "completed" ? (m.teamGoals > m.opponentGoals ? "W" : m.teamGoals < m.opponentGoals ? "L" : "D") : null;
          const resultColor = result === "W" ? "bg-emerald-500" : result === "L" ? "bg-red-500" : result === "D" ? "bg-amber-500" : "bg-blue-500";
          return (
            <button key={m.id} onClick={() => dispatch({ type: "SET_CURRENT_MATCH", match: m })}
              className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.99]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${resultColor} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>
                    {m.status === "completed" ? result : m.status === "live" ? "⏱" : "📋"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">vs {m.opponent}</div>
                    <div className="text-xs text-gray-500">{formatDate(m.date)} · {m.venue === "home" ? "Home" : "Away"}{m.tag && <span className="ml-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">{m.tag}</span>}</div>
                  </div>
                </div>
                {m.status === "completed" && <div className="text-xl font-bold text-gray-900">{m.teamGoals} - {m.opponentGoals}</div>}
                {m.status === "setup" && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Setup</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- New Match ---

function NewMatch({ state, dispatch }) {
  const [opponent, setOpponent] = useState("");
  const [venue, setVenue] = useState("home");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [touched, setTouched] = useState(false);
  const showError = touched && !opponent.trim();
  const existingTags = [...new Set(state.matches.map((m) => m.tag).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Btn variant="ghost" size="sm" onClick={() => dispatch({ type: "SET_VIEW", view: "dashboard" })}><Icon name="back" /></Btn>
        <h1 className="text-2xl font-bold text-gray-900">New Match</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
          <input value={opponent} onChange={(e) => setOpponent(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. City FC"
            className={`w-full px-4 py-2.5 rounded-xl border ${showError ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"} outline-none transition`} />
          {showError && <p className="text-red-500 text-xs mt-1">Please enter an opponent name</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
          <div className="flex gap-2">
            {["home", "away"].map((v) => (
              <button key={v} onClick={() => setVenue(v)}
                className={`flex-1 py-2.5 rounded-xl font-medium transition ${venue === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {v === "home" ? "🏠 Home" : "✈️ Away"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tag <span className="text-gray-400 font-normal">(optional)</span></label>
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Season 2026, Gala Day, Finals"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
          {existingTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {existingTags.map((t) => (
                <button key={t} onClick={() => setTag(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${tag === t ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Round 3 of the winter comp, wet conditions expected..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none" rows={3} />
        </div>
        <Btn variant="primary" size="lg" className="w-full"
          onClick={() => { setTouched(true); if (opponent.trim()) dispatch({ type: "CREATE_MATCH", opponent: opponent.trim(), venue, date, description: description.trim(), tag: tag.trim() }); }}>
          Create Match
        </Btn>
      </div>
    </div>
  );
}

// --- Match Setup ---

function MatchSetup({ state, dispatch }) {
  const match = state.currentMatch;
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const startingCount = match.players.filter((p) => p.starting).length;
  const startEditing = (p) => { setEditingId(p.id); setEditVal(p.name); };
  const saveEdit = () => { if (editVal.trim()) dispatch({ type: "UPDATE_PLAYER_NAME", playerId: editingId, name: editVal.trim() }); setEditingId(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Btn variant="ghost" size="sm" onClick={() => dispatch({ type: "SET_VIEW", view: "dashboard" })}><Icon name="back" /></Btn>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">vs {match.opponent}</h1>
          <p className="text-xs text-gray-500">{formatDate(match.date)} · {match.venue === "home" ? "Home" : "Away"}</p>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => dispatch({ type: "SET_VIEW", view: "match-edit" })}><Icon name="edit" size={18} /> Edit details</Btn>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Select Starting XI</h2>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${startingCount === 11 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{startingCount}/11</span>
        </div>
        <div className="space-y-2">
          {match.players.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl transition ${p.starting ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-transparent"}`}>
              <button onClick={() => dispatch({ type: "TOGGLE_STARTING", playerId: p.id })}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${p.starting ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"}`}>
                {p.starting && <Icon name="check" size={14} />}
              </button>
              {editingId === p.id ? (
                <input value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus
                  className="flex-1 px-2 py-1 rounded-lg border border-blue-300 outline-none text-sm" />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-800 cursor-pointer" onClick={() => startEditing(p)}>{p.name}</span>
              )}
              <Btn variant="ghost" size="xs" onClick={() => startEditing(p)}><Icon name="edit" /></Btn>
              <Btn variant="ghost" size="xs" onClick={() => dispatch({ type: "REMOVE_MATCH_PLAYER", playerId: p.id })}><Icon name="x" /></Btn>
            </div>
          ))}
        </div>
        <Btn variant="default" size="sm" className="w-full mt-3" onClick={() => dispatch({ type: "ADD_MATCH_PLAYER", name: `Player ${match.players.length + 1}` })}>Add Player</Btn>
      </div>
      <Btn variant="primary" size="lg" className="w-full" onClick={() => dispatch({ type: "START_MATCH" })}>Start Match</Btn>
    </div>
  );
}

// --- Live Match ---

function LiveMatch({ state, dispatch }) {
  const match = state.currentMatch;
  const [expanded, setExpanded] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const onField = match.players.filter((p) => p.onField);
  const bench = match.players.filter((p) => !p.onField);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Btn variant="ghost" size="sm" onClick={() => dispatch({ type: "SET_VIEW", view: "dashboard" })}><Icon name="back" /></Btn>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">vs {match.opponent}</h1>
          <p className="text-xs text-gray-500">{match.venue === "home" ? "Home" : "Away"}</p>
        </div>
      </div>
      <div className="bg-gray-900 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={() => dispatch({ type: "TOGGLE_MATCH_CLOCK" })}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${match.matchRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
            <Icon name={match.matchRunning ? "pause" : "play"} size={20} />
          </button>
          <div className="text-center">
            <div className="text-3xl font-mono font-bold tabular-nums">{formatTime(match.matchSeconds)}</div>
            <div className="text-xs opacity-50 mt-0.5">Match Time</div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <div className="text-center flex-1">
            <div className="text-xs opacity-60 mb-1">{TEAM_NAME}</div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "teamGoals", delta: -1 })} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"><Icon name="minus" size={14} /></button>
              <span className="text-3xl font-bold tabular-nums">{match.teamGoals}</span>
              <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "teamGoals", delta: 1 })} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"><Icon name="plus" size={14} /></button>
            </div>
          </div>
          <div className="text-2xl font-light opacity-30 mx-4">–</div>
          <div className="text-center flex-1">
            <div className="text-xs opacity-60 mb-1">{match.opponent}</div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "opponentGoals", delta: -1 })} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"><Icon name="minus" size={14} /></button>
              <span className="text-3xl font-bold tabular-nums">{match.opponentGoals}</span>
              <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "opponentGoals", delta: 1 })} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"><Icon name="plus" size={14} /></button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1">🏃 On Field ({onField.length})</h2>
          <div className="flex gap-1.5">
            <Btn variant="primary" size="xs" onClick={() => onField.forEach((p) => { if (!p.running) dispatch({ type: "TOGGLE_TIMER", playerId: p.id }); })}>Start all</Btn>
            <Btn variant="warning" size="xs" onClick={() => onField.forEach((p) => { if (p.running) dispatch({ type: "TOGGLE_TIMER", playerId: p.id }); })}>Pause all</Btn>
          </div>
        </div>
        <div className="space-y-2">
          {onField.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                  <div className="text-lg font-mono font-bold text-blue-600 tabular-nums">{formatTime(p.seconds)}</div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => dispatch({ type: "TOGGLE_TIMER", playerId: p.id })}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${p.running ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
                    <Icon name={p.running ? "pause" : "play"} />
                  </button>
                  <button onClick={() => dispatch({ type: "SUB_OFF", playerId: p.id })}
                    className="w-10 h-10 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center transition">
                    <Icon name="swap" />
                  </button>
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${expanded === p.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    <Icon name={expanded === p.id ? "up" : "down"} />
                  </button>
                </div>
              </div>
              {expanded === p.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[{ key: "goals", label: "⚽ Goals" }, { key: "assists", label: "🅰️ Assists" }].map((s) => (
                      <div key={s.key} className="text-center">
                        <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => dispatch({ type: "UPDATE_STAT", playerId: p.id, stat: s.key, delta: -1 })} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold">−</button>
                          <span className="w-8 text-center font-bold text-base">{p[s.key]}</span>
                          <button onClick={() => dispatch({ type: "UPDATE_STAT", playerId: p.id, stat: s.key, delta: 1 })} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {p.events.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Stints</div>
                      <div className="flex flex-wrap gap-1">
                        {getPlayerStints(p, match.matchSeconds).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{formatTime(s.on)} → {formatTime(s.off)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                    <textarea value={p.notes} onChange={(e) => dispatch({ type: "UPDATE_PLAYER_NOTES", playerId: p.id, notes: e.target.value })}
                      placeholder="Add notes for this player..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none text-sm resize-none" rows={2} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {bench.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1">🪑 Bench ({bench.length})</h2>
          <div className="space-y-2">
            {bench.map((p) => (
              <div key={p.id} className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-700 truncate">{p.name}</div>
                  <div className="text-sm font-mono text-gray-400 tabular-nums">{formatTime(p.seconds)}</div>
                </div>
                <Btn variant="primary" size="sm" onClick={() => dispatch({ type: "SUB_ON", playerId: p.id })}>Sub On</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pt-2">
        {!confirmEnd ? (
          <Btn variant="danger" size="lg" className="w-full" onClick={() => setConfirmEnd(true)}>End Match</Btn>
        ) : (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-4 space-y-3">
            <p className="text-sm text-red-800 font-medium text-center">Are you sure you want to end this match?</p>
            <div className="flex gap-2">
              <Btn variant="default" size="md" className="flex-1" onClick={() => setConfirmEnd(false)}>Cancel</Btn>
              <Btn variant="danger" size="md" className="flex-1" onClick={() => dispatch({ type: "END_MATCH" })}>End Match</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Match Review ---

function MatchReview({ state, dispatch }) {
  const match = state.currentMatch;
  const result = match.teamGoals > match.opponentGoals ? "Win" : match.teamGoals < match.opponentGoals ? "Loss" : "Draw";
  const sorted = [...match.players].sort((a, b) => b.seconds - a.seconds);
  const playersWithNotes = sorted.filter((p) => p.notes);
  const totalMatchMins = Math.round(match.matchSeconds / 60);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Btn variant="ghost" size="sm" onClick={() => dispatch({ type: "SET_VIEW", view: "dashboard" })}><Icon name="back" /></Btn>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">vs {match.opponent}</h1>
          <p className="text-xs text-gray-500">{formatDate(match.date)} · {match.venue === "home" ? "Home" : "Away"}</p>
        </div>
        <Btn variant="default" size="sm" onClick={() => exportMatchCSV(match)}>Export</Btn>
      </div>
      <div className="bg-gray-900 rounded-2xl p-5 text-white text-center">
        <div className={`text-sm font-semibold mb-2 ${result === "Win" ? "text-emerald-400" : result === "Loss" ? "text-red-400" : "text-amber-400"}`}>{result}</div>
        <div className="text-4xl font-bold">{match.teamGoals} – {match.opponentGoals}</div>
        <div className="text-sm opacity-50 mt-2 font-mono">{formatTime(match.matchSeconds)} match time</div>
        {match.tag && <div className="mt-2"><span className="px-2 py-0.5 bg-white/10 rounded-full text-xs font-medium">{match.tag}</span></div>}
      </div>
      {match.description && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 mb-1">Description</h3>
          <p className="text-sm text-gray-700">{match.description}</p>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Player Stats</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="p-3">Player</th><th className="p-3 text-center">On</th><th className="p-3 text-center">Off</th><th className="p-3 text-center">⚽</th><th className="p-3 text-center">🅰️</th>
            </tr></thead>
            <tbody>{sorted.map((p) => {
              const minsOn = Math.round(p.seconds / 60);
              const minsOff = Math.max(0, totalMatchMins - minsOn);
              return (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-center font-mono text-emerald-600">{minsOn}′</td>
                  <td className="p-3 text-center font-mono text-gray-400">{minsOff}′</td>
                  <td className="p-3 text-center">{p.goals}</td>
                  <td className="p-3 text-center">{p.assists}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Player Timeline</h2></div>
        <div className="divide-y divide-gray-100">
          {sorted.filter((p) => p.events.length > 0).map((p) => {
            const stints = getPlayerStints(p, match.matchSeconds);
            return (
              <div key={p.id} className="p-4">
                <div className="font-medium text-sm text-gray-900 mb-2">{p.name}</div>
                <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
                  {stints.map((s, i) => {
                    const left = match.matchSeconds > 0 ? (s.on / match.matchSeconds) * 100 : 0;
                    const width = match.matchSeconds > 0 ? ((s.off - s.on) / match.matchSeconds) * 100 : 0;
                    return <div key={i} className="absolute top-0 h-full bg-blue-400 rounded-full" style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }} />;
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {stints.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{formatTime(s.on)} → {formatTime(s.off)}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {playersWithNotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900 flex items-center gap-2"><Icon name="note" size={16} />Player Notes</h2></div>
          <div className="divide-y divide-gray-100">
            {playersWithNotes.map((p) => (
              <div key={p.id} className="p-4">
                <div className="font-medium text-sm text-gray-900 mb-1">{p.name}</div>
                <p className="text-sm text-gray-600">{p.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pt-2">
        <Btn variant="default" size="md" className="w-full" onClick={() => dispatch({ type: "SET_VIEW", view: "match-edit" })}>
          <Icon name="edit" size={16} /> Edit Match
        </Btn>
      </div>
    </div>
  );
}

// --- Match Edit (non-live only; no timers) ---

const DRAWER_DURATION_MS = 300;

function MatchEdit({ state, dispatch }) {
  const match = state.currentMatch;
  const isCompleted = match.status === "completed";
  const [expanded, setExpanded] = useState(null);
  const [timelineDrawerOpen, setTimelineDrawerOpen] = useState(false);
  const [drawerEntering, setDrawerEntering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const goBack = () => dispatch({ type: "SET_VIEW", view: isCompleted ? "dashboard" : "setup" });
  const sorted = isCompleted ? [...match.players].sort((a, b) => b.seconds - a.seconds) : [];
  const totalMatchMins = isCompleted ? Math.round(match.matchSeconds / 60) : 0;
  const playersWithNotes = sorted.filter((p) => p.notes?.trim());

  useEffect(() => {
    if (timelineDrawerOpen) {
      setDrawerEntering(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDrawerEntering(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setDrawerEntering(false);
    }
  }, [timelineDrawerOpen]);

  useEffect(() => {
    if (!drawerEntering && timelineDrawerOpen) {
      const id = setTimeout(() => setTimelineDrawerOpen(false), DRAWER_DURATION_MS);
      return () => clearTimeout(id);
    }
  }, [drawerEntering, timelineDrawerOpen]);

  const closeTimelineDrawer = () => setDrawerEntering(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Btn variant="ghost" size="sm" onClick={goBack}><Icon name="back" /></Btn>
        <h1 className="text-xl font-bold text-gray-900">Edit Match</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
          <input value={match.opponent} onChange={(e) => dispatch({ type: "UPDATE_MATCH_META", opponent: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
          <div className="flex gap-2">
            {["home", "away"].map((v) => (
              <button key={v} onClick={() => dispatch({ type: "UPDATE_MATCH_META", venue: v })}
                className={`flex-1 py-2.5 rounded-xl font-medium transition ${match.venue === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {v === "home" ? "🏠 Home" : "✈️ Away"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={match.date} onChange={(e) => dispatch({ type: "UPDATE_MATCH_META", date: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tag <span className="text-gray-400 font-normal">(optional)</span></label>
          <input value={match.tag || ""} onChange={(e) => dispatch({ type: "UPDATE_MATCH_META", tag: e.target.value })}
            placeholder="e.g. Season 2026"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea value={match.description || ""} onChange={(e) => dispatch({ type: "UPDATE_MATCH_META", description: e.target.value })}
            placeholder="Match notes..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none" rows={2} />
        </div>
      </div>

      {isCompleted && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Score & duration</h2>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Us</div>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "teamGoals", delta: -1 })} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">−</button>
                  <span className="w-10 text-center text-2xl font-bold tabular-nums">{match.teamGoals}</span>
                  <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "teamGoals", delta: 1 })} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">+</button>
                </div>
              </div>
              <span className="text-xl text-gray-300">–</span>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">{match.opponent}</div>
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "opponentGoals", delta: -1 })} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">−</button>
                  <span className="w-10 text-center text-2xl font-bold tabular-nums">{match.opponentGoals}</span>
                  <button onClick={() => dispatch({ type: "UPDATE_SCORE", field: "opponentGoals", delta: 1 })} className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold">+</button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Match length (minutes)</label>
              <input type="number" min={0} value={Math.round(match.matchSeconds / 60)} onChange={(e) => dispatch({ type: "UPDATE_MATCH_SECONDS", seconds: Math.max(0, parseInt(e.target.value, 10) || 0) * 60 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Player stats</h2></div>
            <div className="divide-y divide-gray-100">
              {match.players.map((p) => (
                <div key={p.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">⚽ {p.goals}  🅰️ {p.assists}{p.notes?.trim() ? "  · Note" : ""}</div>
                    </div>
                    <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0 ${expanded === p.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      <Icon name={expanded === p.id ? "up" : "down"} size={18} />
                    </button>
                  </div>
                  {expanded === p.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">⚽ Goals</label>
                          <div className="flex items-center gap-2">
                            <button onClick={() => dispatch({ type: "UPDATE_STAT", playerId: p.id, stat: "goals", delta: -1 })} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm">−</button>
                            <span className="w-8 text-center font-bold">{p.goals}</span>
                            <button onClick={() => dispatch({ type: "UPDATE_STAT", playerId: p.id, stat: "goals", delta: 1 })} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm">+</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">🅰️ Assists</label>
                          <div className="flex items-center gap-2">
                            <button onClick={() => dispatch({ type: "UPDATE_STAT", playerId: p.id, stat: "assists", delta: -1 })} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm">−</button>
                            <span className="w-8 text-center font-bold">{p.assists}</span>
                            <button onClick={() => dispatch({ type: "UPDATE_STAT", playerId: p.id, stat: "assists", delta: 1 })} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm">+</button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Notes</label>
                        <textarea value={p.notes || ""} onChange={(e) => dispatch({ type: "UPDATE_PLAYER_NOTES", playerId: p.id, notes: e.target.value })}
                          placeholder="Optional notes..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 outline-none text-sm resize-none" rows={2} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Player Stats</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Player</th><th className="p-3 text-center">On</th><th className="p-3 text-center">Off</th><th className="p-3 text-center">⚽</th><th className="p-3 text-center">🅰️</th>
                </tr></thead>
                <tbody>{sorted.map((p) => {
                  const minsOn = Math.round(p.seconds / 60);
                  const minsOff = Math.max(0, totalMatchMins - minsOn);
                  return (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-center font-mono text-emerald-600">{minsOn}′</td>
                      <td className="p-3 text-center font-mono text-gray-400">{minsOff}′</td>
                      <td className="p-3 text-center">{p.goals}</td>
                      <td className="p-3 text-center">{p.assists}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>

          <div>
            <button type="button" onClick={() => setTimelineDrawerOpen(true)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition text-left">
              <span className="font-semibold text-gray-900">Player Timeline</span>
              <Icon name="up" size={18} className="text-gray-400 rotate-90 shrink-0" />
            </button>
            {timelineDrawerOpen && (
              <>
                <div
                  className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-out ${drawerEntering ? "opacity-100" : "opacity-0"}`}
                  onClick={closeTimelineDrawer}
                  aria-hidden
                />
                <div
                  className={`fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] flex flex-col bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ease-out ${drawerEntering ? "translate-y-0" : "translate-y-full"}`}
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                    <h2 className="font-semibold text-gray-900">Player Timeline</h2>
                    <button type="button" onClick={closeTimelineDrawer} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                  <div className="overflow-y-auto divide-y divide-gray-100 p-4">
                    {sorted.filter((p) => p.events.length > 0).map((p) => {
                      const stints = getPlayerStints(p, match.matchSeconds);
                      return (
                        <div key={p.id} className="py-4 first:pt-0">
                          <div className="font-medium text-sm text-gray-900 mb-2">{p.name}</div>
                          <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
                            {stints.map((s, i) => {
                              const left = match.matchSeconds > 0 ? (s.on / match.matchSeconds) * 100 : 0;
                              const width = match.matchSeconds > 0 ? ((s.off - s.on) / match.matchSeconds) * 100 : 0;
                              return <div key={i} className="absolute top-0 h-full bg-blue-400 rounded-full" style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }} />;
                            })}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {stints.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{formatTime(s.on)} → {formatTime(s.off)}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {playersWithNotes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900 flex items-center gap-2"><Icon name="note" size={16} />Player Notes</h2></div>
              <div className="divide-y divide-gray-100">
                {playersWithNotes.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="font-medium text-sm text-gray-900 mb-1">{p.name}</div>
                    <p className="text-sm text-gray-600">{p.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Btn variant="primary" size="lg" className="w-full" onClick={goBack}>Done</Btn>

      <div className="pt-2">
        {!confirmDelete ? (
          <Btn variant="danger" size="lg" className="w-full" onClick={() => setConfirmDelete(true)}>Delete Match</Btn>
        ) : (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-4 space-y-3">
            <p className="text-sm text-red-800 font-medium text-center">Are you sure you want to delete this match? This cannot be undone.</p>
            <div className="flex gap-2">
              <Btn variant="default" size="md" className="flex-1" onClick={() => setConfirmDelete(false)}>Cancel</Btn>
              <Btn variant="danger" size="md" className="flex-1" onClick={() => dispatch({ type: "DELETE_MATCH" })}>Delete Match</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- App ---

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const intervalRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const data = loadState();
    dispatch({ type: "LOAD_SAVED", data: data || initialState });
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveState(state), 500);
  }, [state]);

  useEffect(() => {
    if (state.currentMatch?.status === "live") {
      intervalRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
      return () => clearInterval(intervalRef.current);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [state.currentMatch?.status, state.currentMatch?.id]);

  const navItems = [
    { view: "dashboard", icon: "home", label: "Dashboard" },
    { view: "new-match", icon: "plus", label: "New Match" },
    { view: "squad", icon: "users", label: "Squad" },
  ];

  if (!state.loaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {state.view === "dashboard" && <Dashboard state={state} dispatch={dispatch} />}
        {state.view === "new-match" && <NewMatch state={state} dispatch={dispatch} />}
        {state.view === "squad" && <SquadView state={state} dispatch={dispatch} />}
        {state.view === "setup" && <MatchSetup state={state} dispatch={dispatch} />}
        {state.view === "match" && <LiveMatch state={state} dispatch={dispatch} />}
        {state.view === "match-review" && <MatchReview state={state} dispatch={dispatch} />}
        {state.view === "match-edit" && <MatchEdit state={state} dispatch={dispatch} />}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
        {navItems.map((item) => (
          <button key={item.view} onClick={() => dispatch({ type: "SET_VIEW", view: item.view })}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition ${state.view === item.view ? "text-blue-600" : "text-gray-400"}`}>
            <Icon name={item.icon} size={20} /><span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
        {state.currentMatch?.status === "live" && (
          <button onClick={() => dispatch({ type: "SET_VIEW", view: "match" })}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition ${state.view === "match" ? "text-blue-600" : "text-gray-400"}`}>
            <span className="relative"><Icon name="clock" size={20} /><span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" /></span>
            <span className="text-xs font-medium">Live</span>
          </button>
        )}
      </div>
    </div>
  );
}