import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Using localStorage only.");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Legacy constant - no longer used (now uses team IDs)
export const APP_STATE_ROW_ID = "default";

// ===== Authentication Helpers =====

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} fullName - User's full name (optional)
 * @returns {Promise<{user, session, error}>}
 */
export async function signUp(email, password, fullName = "") {
  if (!supabase) {
    return { user: null, session: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { user: data?.user, session: data?.session, error };
}

/**
 * Sign in an existing user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<{user, session, error}>}
 */
export async function signIn(email, password) {
  if (!supabase) {
    return { user: null, session: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { user: data?.user, session: data?.session, error };
}

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export async function signOut() {
  if (!supabase) {
    return { error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current user session
 * @returns {Promise<{session, error}>}
 */
export async function getSession() {
  if (!supabase) {
    return { session: null, error: null };
  }

  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session, error };
}

/**
 * Get the current user
 * @returns {Promise<{user, error}>}
 */
export async function getUser() {
  if (!supabase) {
    return { user: null, error: null };
  }

  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
}

/**
 * Listen to auth state changes
 * @param {function} callback - Function to call when auth state changes
 * @returns {object} Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Send password reset email
 * @param {string} email - User's email
 * @returns {Promise<{error}>}
 */
export async function resetPassword(email) {
  if (!supabase) {
    return { error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  return { error };
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<{user, error}>}
 */
export async function updatePassword(newPassword) {
  if (!supabase) {
    return { user: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { user: data?.user, error };
}

// ===== Team & User Helpers =====

/**
 * Get all teams for the current user
 * @returns {Promise<{teams, error}>}
 */
export async function getUserTeams() {
  if (!supabase) {
    return { teams: [], error: null };
  }

  const { data, error } = await supabase
    .rpc('get_user_teams', { user_id: (await getUser()).user?.id });

  return { teams: data || [], error };
}

/**
 * Create a new team for the current user
 * @param {string} teamTitle - Team name
 * @param {string} clubId - Optional club ID
 * @returns {Promise<{team, error}>}
 */
export async function createTeam(teamTitle, clubId = null) {
  if (!supabase) {
    console.error('Supabase not configured');
    return { team: null, error: { message: "Supabase not configured" } };
  }

  const user = await getUser();

  if (!user.user) {
    console.error('Not authenticated');
    return { team: null, error: { message: "Not authenticated" } };
  }

  // Create team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ title: teamTitle, club_id: clubId })
    .select()
    .single();

  if (teamError) {
    console.error('Team creation error:', teamError);
    return { team: null, error: teamError };
  }

  // Add user as team staff
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: user.user.id,
      role: 'team_staff',
    });

  if (memberError) {
    console.error('Team member error:', memberError);
    return { team: null, error: memberError };
  }

  return { team, error: null };
}

/**
 * Check if user is a super admin
 * @returns {Promise<{isAdmin, error}>}
 */
export async function isSuperAdmin() {
  if (!supabase) {
    return { isAdmin: false, error: null };
  }

  const user = await getUser();
  if (!user.user) {
    return { isAdmin: false, error: null };
  }

  const { data, error } = await supabase
    .rpc('is_super_admin', { user_id: user.user.id });

  return { isAdmin: data || false, error };
}

/**
 * Get user's role for a specific team
 * @param {string} teamId - Team UUID
 * @returns {Promise<{role, error}>}
 */
export async function getUserTeamRole(teamId) {
  if (!supabase) {
    return { role: null, error: null };
  }

  const user = await getUser();
  if (!user.user) {
    return { role: null, error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.user.id)
    .single();

  return { role: data?.role, error };
}

// ===== Guest Data Migration =====

/**
 * Migrate guest data from localStorage to Supabase
 * @param {string} teamId - Team UUID to migrate data to
 * @param {string} storageKey - localStorage key (default: "soccer-tracker-data")
 * @returns {Promise<{success, migratedData, error}>}
 */
export async function migrateGuestDataToTeam(teamId, storageKey = "soccer-tracker-data") {
  if (!supabase) {
    return { success: false, migratedData: null, error: { message: "Supabase not configured" } };
  }

  if (!teamId) {
    return { success: false, migratedData: null, error: { message: "Team ID required" } };
  }

  try {
    // Load guest data from localStorage
    const rawData = localStorage.getItem(storageKey);
    if (!rawData) {
      return { success: true, migratedData: null, error: null }; // No data to migrate
    }

    const guestData = JSON.parse(rawData);

    // Update team title if provided
    if (guestData.teamTitle) {
      await supabase.from("teams").update(
        { title: guestData.teamTitle, updated_at: new Date().toISOString() }
      ).eq("id", teamId);
    }

    // Migrate players (squad)
    if (guestData.squad?.length) {
      await supabase.from("players").insert(
        guestData.squad.map((p, i) => ({
          id: p.id,
          team_id: teamId,
          name: p.name,
          sort_order: i,
        }))
      );
    }

    // Migrate clubs
    if (guestData.clubs?.length) {
      await supabase.from("clubs").insert(
        guestData.clubs.map((c) => ({
          id: c.id,
          name: c.name,
        }))
      );
    }

    // Migrate matches
    if (guestData.matches?.length) {
      for (const m of guestData.matches) {
        await supabase.from("matches").insert({
          id: m.id,
          team_id: teamId,
          opponent: m.opponent || "",
          venue: m.venue || "home",
          date: m.date || "",
          description: m.description || "",
          tag: m.tag || "",
          status: m.status || "setup",
          team_goals: m.teamGoals ?? 0,
          opponent_goals: m.opponentGoals ?? 0,
          match_seconds: m.matchSeconds ?? 0,
          match_running: !!m.matchRunning,
        });

        // Migrate match players
        if (m.players?.length) {
          await supabase.from("match_players").insert(
            m.players.map((p) => ({
              match_id: m.id,
              player_id: p.id,
              player_name: p.name || "",
              seconds: p.seconds ?? 0,
              starting: !!p.starting,
              goals: p.goals ?? 0,
              assists: p.assists ?? 0,
              notes: p.notes || "",
              events: p.events || [],
              position_role: p.position?.role || null,
              position_side: p.position?.side || null,
            }))
          );
        }
      }
    }

    // Migrate current match if exists
    if (guestData.currentMatch) {
      const m = guestData.currentMatch;
      await supabase.from("matches").insert({
        id: m.id,
        team_id: teamId,
        opponent: m.opponent || "",
        venue: m.venue || "home",
        date: m.date || "",
        description: m.description || "",
        tag: m.tag || "",
        status: m.status || "setup",
        team_goals: m.teamGoals ?? 0,
        opponent_goals: m.opponentGoals ?? 0,
        match_seconds: m.matchSeconds ?? 0,
        match_running: !!m.matchRunning,
      });

      // Migrate current match players
      if (m.players?.length) {
        await supabase.from("match_players").insert(
          m.players.map((p) => ({
            match_id: m.id,
            player_id: p.id,
            player_name: p.name || "",
            seconds: p.seconds ?? 0,
            starting: !!p.starting,
            goals: p.goals ?? 0,
            assists: p.assists ?? 0,
            notes: p.notes || "",
            events: p.events || [],
            position_role: p.position?.role || null,
            position_side: p.position?.side || null,
          }))
        );
      }
    }

    // Save blob storage backup
    await supabase.from("app_state").upsert(
      { id: teamId, data: guestData, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

    return { success: true, migratedData: guestData, error: null };
  } catch (e) {
    console.error("Failed to migrate guest data:", e);
    return { success: false, migratedData: null, error: e };
  }
}

// ===== Team Invitation Helpers =====

/**
 * Create a team invitation
 * @param {string} teamId - Team UUID
 * @param {string} inviteeEmail - Email of the person to invite
 * @param {string} role - Role to assign (team_staff or club_admin)
 * @returns {Promise<{invitation, error}>}
 */
export async function createInvitation(teamId, inviteeEmail, role = 'team_staff') {
  if (!supabase) {
    return { invitation: null, error: { message: "Supabase not configured" } };
  }

  const user = await getUser();
  if (!user.user) {
    return { invitation: null, error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      team_id: teamId,
      inviter_id: user.user.id,
      invitee_email: inviteeEmail,
      role: role,
    })
    .select()
    .single();

  return { invitation: data, error };
}

/**
 * Get invitations for a team
 * @param {string} teamId - Team UUID
 * @returns {Promise<{invitations, error}>}
 */
export async function getTeamInvitations(teamId) {
  if (!supabase) {
    return { invitations: [], error: null };
  }

  const { data, error } = await supabase
    .rpc('get_team_invitations', { p_team_id: teamId });

  return { invitations: data || [], error };
}

/**
 * Get pending invitations for the current user
 * @returns {Promise<{invitations, error}>}
 */
export async function getMyInvitations() {
  if (!supabase) {
    return { invitations: [], error: null };
  }

  const { data, error } = await supabase
    .rpc('get_my_invitations');

  return { invitations: data || [], error };
}

/**
 * Accept an invitation
 * @param {string} token - Invitation token
 * @returns {Promise<{success, teamId, role, error}>}
 */
export async function acceptInvitation(token) {
  if (!supabase) {
    return { success: false, teamId: null, role: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase
    .rpc('accept_invitation', { invitation_token: token });

  if (error) {
    return { success: false, teamId: null, role: null, error };
  }

  return {
    success: data?.success || false,
    teamId: data?.team_id,
    role: data?.role,
    error: data?.error ? { message: data.error } : null,
  };
}

/**
 * Decline an invitation
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success, error}>}
 */
export async function declineInvitation(invitationId) {
  if (!supabase) {
    return { success: false, error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId);

  return { success: !error, error };
}

/**
 * Cancel/delete an invitation (for team staff)
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success, error}>}
 */
export async function cancelInvitation(invitationId) {
  if (!supabase) {
    return { success: false, error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  return { success: !error, error };
}

// ===== Club Invitation Helpers =====

/**
 * Create a club invitation
 * @param {string} clubId - Club UUID
 * @param {string} inviteeEmail - Email of the person to invite
 * @param {string} role - Role to assign (team_staff or club_admin)
 * @returns {Promise<{invitation, error}>}
 */
export async function createClubInvitation(clubId, inviteeEmail, role = 'team_staff') {
  if (!supabase) {
    return { invitation: null, error: { message: "Supabase not configured" } };
  }

  const user = await getUser();
  if (!user.user) {
    return { invitation: null, error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from('club_invitations')
    .insert({
      club_id: clubId,
      inviter_id: user.user.id,
      invitee_email: inviteeEmail,
      role: role,
    })
    .select()
    .single();

  return { invitation: data, error };
}

/**
 * Get invitations for a club
 * @param {string} clubId - Club UUID
 * @returns {Promise<{invitations, error}>}
 */
export async function getClubInvitations(clubId) {
  if (!supabase) {
    return { invitations: [], error: null };
  }

  const { data, error } = await supabase
    .rpc('get_club_invitations', { p_club_id: clubId });

  return { invitations: data || [], error };
}

/**
 * Get pending club invitations for the current user
 * @returns {Promise<{invitations, error}>}
 */
export async function getMyClubInvitations() {
  if (!supabase) {
    return { invitations: [], error: null };
  }

  const { data, error } = await supabase
    .rpc('get_my_club_invitations');

  return { invitations: data || [], error };
}

/**
 * Accept a club invitation
 * @param {string} token - Invitation token
 * @returns {Promise<{success, clubId, error}>}
 */
export async function acceptClubInvitation(token) {
  if (!supabase) {
    return { success: false, clubId: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase
    .rpc('accept_club_invitation', { invitation_token: token });

  if (error) {
    return { success: false, clubId: null, error };
  }

  return {
    success: data?.success || false,
    clubId: data?.club_id,
    error: data?.error ? { message: data.error } : null,
  };
}

/**
 * Decline a club invitation
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success, error}>}
 */
export async function declineClubInvitation(invitationId) {
  if (!supabase) {
    return { success: false, error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase
    .from('club_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId);

  return { success: !error, error };
}

/**
 * Cancel/delete a club invitation (for club admins)
 * @param {string} invitationId - Invitation UUID
 * @returns {Promise<{success, error}>}
 */
export async function cancelClubInvitation(invitationId) {
  if (!supabase) {
    return { success: false, error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase
    .from('club_invitations')
    .delete()
    .eq('id', invitationId);

  return { success: !error, error };
}

// ===== Club Helpers =====

/**
 * Get all clubs the current user is a member of
 * @returns {Promise<{clubs, error}>}
 */
export async function getUserClubs() {
  if (!supabase) {
    return { clubs: [], error: null };
  }

  const user = await getUser();
  if (!user.user) {
    return { clubs: [], error: { message: "Not authenticated" } };
  }

  const { data, error } = await supabase
    .from('club_members')
    .select('club_id, role, clubs(id, name)')
    .eq('user_id', user.user.id);

  if (error) {
    return { clubs: [], error };
  }

  // Transform to flatten club data
  const clubs = data.map(cm => ({
    id: cm.clubs.id,
    name: cm.clubs.name,
    role: cm.role,
  }));

  return { clubs, error: null };
}

/**
 * Create a new club (super admin only)
 * @param {string} clubName - Club name
 * @returns {Promise<{club, error}>}
 */
export async function createClub(clubName) {
  if (!supabase) {
    return { club: null, error: { message: "Supabase not configured" } };
  }

  const { data, error } = await supabase
    .from('clubs')
    .insert({ name: clubName })
    .select()
    .single();

  return { club: data, error };
}

/**
 * Get all clubs (for super admin or club selection)
 * @returns {Promise<{clubs, error}>}
 */
export async function getAllClubs() {
  if (!supabase) {
    return { clubs: [], error: null };
  }

  const { data, error } = await supabase
    .from('clubs')
    .select('id, name')
    .order('name');

  return { clubs: data || [], error };
}

/**
 * Add user to a club
 * @param {string} clubId - Club UUID
 * @param {string} userId - User UUID (optional, defaults to current user)
 * @param {string} role - Role to assign (team_staff or club_admin)
 * @returns {Promise<{success, error}>}
 */
export async function addUserToClub(clubId, userId = null, role = 'team_staff') {
  if (!supabase) {
    return { success: false, error: { message: "Supabase not configured" } };
  }

  const userIdToUse = userId || (await getUser()).user?.id;

  if (!userIdToUse) {
    return { success: false, error: { message: "Not authenticated" } };
  }

  const { error } = await supabase
    .from('club_members')
    .insert({
      club_id: clubId,
      user_id: userIdToUse,
      role: role,
    });

  return { success: !error, error };
}
