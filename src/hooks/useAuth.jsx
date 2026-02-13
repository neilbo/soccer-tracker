import { useState, useEffect, createContext, useContext } from 'react';
import {
  signUp as supabaseSignUp,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  getSession,
  getUser,
  onAuthStateChange,
  getUserTeams,
  createTeam,
  isSuperAdmin,
  getUserTeamRole,
  getUserClubs,
  addUserToClub,
} from '../supabaseClient';

// Create Auth Context
const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  isGuest: true,
  currentTeam: null,
  teams: [],
  userClubs: [],
  isSuperAdmin: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  selectTeam: () => {},
  refreshTeams: async () => {},
  createNewTeam: async () => {},
  loadUserClubs: async () => {},
});

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [userClubs, setUserClubs] = useState([]);
  const [isSuperAdminFlag, setIsSuperAdminFlag] = useState(false);

  const isAuthenticated = !!user;
  const isGuest = !isAuthenticated;

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const { data } = onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await loadUserData(session.user);
      } else {
        setUser(null);
        setSession(null);
        setTeams([]);
        setCurrentTeam(null);
        setUserClubs([]);
        setIsSuperAdminFlag(false);
      }

      setLoading(false);
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  // Persist current team to localStorage
  useEffect(() => {
    if (currentTeam) {
      localStorage.setItem('currentTeamId', currentTeam.team_id);
    }
  }, [currentTeam]);

  async function initializeAuth() {
    try {
      const { session } = await getSession();

      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await loadUserData(session.user);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserData(user) {
    try {
      // Load user's teams
      const { teams: userTeams, error: teamsError } = await getUserTeams();

      if (teamsError) {
        console.error('Error loading teams:', teamsError);
        return;
      }

      setTeams(userTeams || []);

      // Set current team (from localStorage or first team)
      const savedTeamId = localStorage.getItem('currentTeamId');
      const currentTeamData = savedTeamId
        ? userTeams.find(t => t.team_id === savedTeamId)
        : userTeams[0];

      if (currentTeamData) {
        setCurrentTeam(currentTeamData);
      }

      // Load user's clubs
      await loadUserClubsData();

      // Check if super admin
      const { isAdmin } = await isSuperAdmin();
      setIsSuperAdminFlag(isAdmin);

      // Handle pending signup data (team/club setup after email verification)
      await completePendingSignup(userTeams);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async function completePendingSignup(existingTeams) {
    try {
      const pendingDataStr = localStorage.getItem('pendingSignupData');
      if (!pendingDataStr) return;

      const pendingData = JSON.parse(pendingDataStr);

      // Add user to club if specified
      if (pendingData.clubId) {
        await addUserToClub(pendingData.clubId);
        await loadUserClubsData(); // Refresh clubs
      }

      // Create team if specified and user doesn't have any teams yet
      if (pendingData.teamName && existingTeams.length === 0) {
        const clubId = pendingData.clubId || null;
        await createTeam(pendingData.teamName, clubId);
        await refreshTeams(); // Refresh teams
      }

      // Clear pending data
      localStorage.removeItem('pendingSignupData');
    } catch (error) {
      console.error('Error completing pending signup:', error);
    }
  }

  async function loadUserClubsData() {
    try {
      const { clubs, error } = await getUserClubs();

      if (error) {
        console.error('Error loading clubs:', error);
        return;
      }

      setUserClubs(clubs || []);
    } catch (error) {
      console.error('Error loading user clubs:', error);
    }
  }

  async function handleSignUp(email, password, fullName) {
    const { user, session, error } = await supabaseSignUp(email, password, fullName);

    if (error) {
      return { error };
    }

    return { user, session, error: null };
  }

  async function handleSignIn(email, password) {
    const { user, session, error } = await supabaseSignIn(email, password);

    if (error) {
      return { error };
    }

    return { user, session, error: null };
  }

  async function handleSignOut() {
    const { error } = await supabaseSignOut();

    if (!error) {
      setUser(null);
      setSession(null);
      setTeams([]);
      setCurrentTeam(null);
      setUserClubs([]);
      setIsSuperAdminFlag(false);
      localStorage.removeItem('currentTeamId');
    }

    return { error };
  }

  function selectTeam(teamId) {
    const team = teams.find(t => t.team_id === teamId);
    if (team) {
      setCurrentTeam(team);
    }
  }

  async function refreshTeams() {
    if (!user) return;

    const { teams: userTeams, error } = await getUserTeams();

    if (!error) {
      setTeams(userTeams || []);

      // Update current team if it's still in the list
      if (currentTeam) {
        const updatedCurrentTeam = userTeams.find(t => t.team_id === currentTeam.team_id);
        if (updatedCurrentTeam) {
          setCurrentTeam(updatedCurrentTeam);
        } else if (userTeams.length > 0) {
          setCurrentTeam(userTeams[0]);
        }
      }
    }

    return { teams: userTeams, error };
  }

  async function createNewTeam(teamTitle, clubId = null) {
    const { team, error } = await createTeam(teamTitle, clubId);

    if (!error && team) {
      await refreshTeams();
      // Auto-select the new team
      selectTeam(team.id);
    }

    return { team, error };
  }

  const value = {
    user,
    session,
    loading,
    isAuthenticated,
    isGuest,
    currentTeam,
    teams,
    userClubs,
    isSuperAdmin: isSuperAdminFlag,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    selectTeam,
    refreshTeams,
    createNewTeam,
    loadUserClubs: loadUserClubsData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// Hook to check permissions for current team
export function usePermissions() {
  const { currentTeam, isSuperAdmin } = useAuth();

  const canEdit = isSuperAdmin || currentTeam?.role === 'team_staff';
  const canView = isSuperAdmin || currentTeam?.role === 'club_admin' || currentTeam?.role === 'team_staff';
  const canExport = true; // All authenticated users can export
  const isReadOnly = currentTeam?.role === 'club_admin' && !isSuperAdmin;

  return {
    canEdit,
    canView,
    canExport,
    isReadOnly,
    isSuperAdmin,
    role: currentTeam?.role,
  };
}
