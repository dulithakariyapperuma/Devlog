/**
 * src/services/authService.ts
 * ─────────────────────────────────────────────────────
 * Authentication service — replaces Supabase Auth.
 * Talks to the Node.js backend via JWT.
 */
import api, { saveToken, clearToken } from "@/lib/apiClient";
import type { TeamMember } from "@/data/mockData";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  role: "SUPER_ADMIN" | "TEAM_LEADER" | "MEMBER";
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  role: "SUPER_ADMIN" | "ORG_OWNER" | "ORG_ADMIN" | "ORG_MEMBER";
}

export interface AuthUser extends TeamMember {
  globalRole: "SUPER_ADMIN" | null;
  organizations: OrgInfo[];
  teams: TeamInfo[];
}

interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  globalRole: "SUPER_ADMIN" | null;
  organizations: OrgInfo[];
  teams: TeamInfo[];
}

function apiUserToMember(u: ApiUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    status: "online",
    role: u.teams[0]?.role ?? "MEMBER",
    password: "",
    isAdmin: u.globalRole === "SUPER_ADMIN",
    globalRole: u.globalRole,
    organizations: u.organizations,
    teams: u.teams,
  };
}

// ── Sign In ───────────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data } = await api.post<{ token: string; user: ApiUser }>(
      "/auth/login",
      { email, password }
    );
    saveToken(data.token);
    return { user: apiUserToMember(data.user), error: null };
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ?? "Login failed";
    return { user: null, error: msg };
  }
}

// ── Register (plain member — joins a team separately) ─────────────────────────

export async function signUp(email: string, password: string, name: string, organizationName: string, teamName?: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data } = await api.post<{ token: string; user: ApiUser }>("/auth/register", {
      email,
      password,
      name,
      organizationName,
      teamName,
    });
    saveToken(data.token);
    return { user: apiUserToMember(data.user), error: null };
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ?? "Registration failed";
    return { user: null, error: msg };
  }
}

// ── Register as Team Leader (creates a team at the same time) ─────────────────

export async function signUpAsLeader(
  email: string,
  password: string,
  name: string,
  teamName: string,
  teamDescription?: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data } = await api.post<{ token: string; user: ApiUser }>(
      "/auth/register-leader",
      { email, password, name, teamName, teamDescription }
    );
    saveToken(data.token);
    return { user: apiUserToMember(data.user), error: null };
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ?? "Registration failed";
    return { user: null, error: msg };
  }
}

// ── Sign Out ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Ignore errors — just clear local state
  } finally {
    clearToken();
  }
}

// ── Get Current User ──────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<ApiUser>("/auth/me");
    return apiUserToMember(data);
  } catch {
    return null;
  }
}

// ── Get All Members (for current team) ────────────────────────────────────────

export async function getAllMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const { data } = await api.get<
      Array<{
        id: string;
        name: string;
        email: string;
        avatar: string;
        role: string;
        status: string;
      }>
    >(`/teams/${teamId}/members`);

    return data.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      status: m.status as TeamMember["status"],
      role: m.role,
      password: "",
    }));
  } catch {
    return [];
  }
}

// ── Update Profile ────────────────────────────────────────────────────────────

export async function updateProfile(
  patch: Partial<Pick<TeamMember, "name" | "role">>
): Promise<void> {
  await api.patch("/auth/me", patch);
}

// ── Update Status in Team ─────────────────────────────────────────────────────

export async function updateMemberStatus(
  teamId: string,
  userId: string,
  status: "online" | "away" | "offline"
): Promise<void> {
  await api.patch(`/teams/${teamId}/members/${userId}/status`, { status });
}
