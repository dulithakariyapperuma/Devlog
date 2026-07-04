/**
 * src/context/AuthContext.tsx
 * ─────────────────────────────────────────────────────
 * Global auth state — now backed by JWT + Node.js backend.
 * Supabase has been removed entirely.
 *
 * Provides:
 *  - currentUser      — logged-in user (null if not logged in)
 *  - activeTeamId     — which team the user is currently viewing
 *  - activeOrgId      — which org the user is currently viewing
 *  - allMembers       — all members in the active team
 *  - isLoading        — true while checking existing session on mount
 *  - login / register / registerAsLeader / logout
 *  - switchTeam       — switch between teams the user belongs to
 *  - switchOrg        — switch between orgs the user belongs to
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { TeamMember } from "@/data/mockData";
import {
  signIn,
  signUp,
  signUpAsLeader,
  signOut,
  getCurrentUser,
  getAllMembers,
  updateProfile,
  updateMemberStatus,
  type AuthUser,
  type TeamInfo,
} from "@/services/authService";
import {
  saveActiveTeam,
  getActiveTeam,
  getStoredToken,
} from "@/lib/apiClient";

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  currentUser: AuthUser | null;
  allMembers: TeamMember[];
  activeOrgId: string | null;
  activeTeamId: string | null;
  myOrgs: import('@/services/authService').OrgInfo[];
  myTeams: TeamInfo[];
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error: string | null }>;
  register: (
    email: string,
    password: string,
    name: string,
    orgName: string,
    teamName: string
  ) => Promise<{ success: boolean; error: string | null }>;
  registerAsLeader: (
    email: string,
    password: string,
    name: string,
    teamName: string,
    teamDescription?: string
  ) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  updateCurrentUser: (
    patch: Partial<Pick<TeamMember, "name" | "role" | "status">>
  ) => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    localStorage.getItem("active_org_id")
  );
  const [activeTeamId, setActiveTeamId] = useState<string | null>(
    getActiveTeam()
  );
  const [isLoading, setIsLoading] = useState(true);

  const myOrgs = currentUser?.organizations ?? [];
  const myTeams = currentUser?.teams ?? [];

  // ── Bootstrap: restore session on mount ────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      // If no token in storage, skip — user is not logged in
      if (!getStoredToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!mounted || !user) {
          setIsLoading(false);
          return;
        }

        setCurrentUser(user);

        // Pick organization
        const storedOrgId = localStorage.getItem("active_org_id");
        const validOrg = user.organizations.find((o) => o.id === storedOrgId) ?? user.organizations[0];
        if (validOrg) {
          setActiveOrgId(validOrg.id);
          localStorage.setItem("active_org_id", validOrg.id);
        }

        // Restore or pick the first available team
        const storedTeamId = getActiveTeam();
        const validTeam =
          user.teams.find((t) => t.id === storedTeamId) ?? user.teams[0];

        if (validTeam) {
          setActiveTeamId(validTeam.id);
          saveActiveTeam(validTeam.id);
          const members = await getAllMembers(validTeam.id);
          if (mounted) setAllMembers(members);
        }
      } catch (err) {
        console.error("[AuthContext] init error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const refreshMembers = useCallback(async () => {
    if (!activeTeamId) return;
    const members = await getAllMembers(activeTeamId);
    setAllMembers(members);
  }, [activeTeamId]);

  // ── Login ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const { user, error } = await signIn(email, password);
    if (!user) return { success: false, error };

    setCurrentUser(user);

    // Pick organization
    const storedOrgId = localStorage.getItem("active_org_id");
    const validOrg = user.organizations.find((o) => o.id === storedOrgId) ?? user.organizations[0];
    if (validOrg) {
      setActiveOrgId(validOrg.id);
      localStorage.setItem("active_org_id", validOrg.id);
    }

    // Pick first team or previously stored team
    const storedTeamId = getActiveTeam();
    const teamToLoad =
      user.teams.find((t) => t.id === storedTeamId) ?? user.teams[0];

    if (teamToLoad) {
      setActiveTeamId(teamToLoad.id);
      saveActiveTeam(teamToLoad.id);
      const members = await getAllMembers(teamToLoad.id);
      setAllMembers(members);
    }

    return { success: true, error: null };
  }, []);

  // ── Register (create workspace) ────────────────────────────────────────────

  const register = useCallback(
    async (email: string, password: string, name: string, orgName: string, teamName: string) => {
      const { user, error } = await signUp(email, password, name, orgName, teamName);
      if (!user) return { success: false, error };
      
      setCurrentUser(user);
      
      const org = user.organizations[0];
      if (org) {
        setActiveOrgId(org.id);
        localStorage.setItem("active_org_id", org.id);
      }

      const team = user.teams[0];
      if (team) {
        setActiveTeamId(team.id);
        saveActiveTeam(team.id);
        const members = await getAllMembers(team.id);
        setAllMembers(members);
      }

      return { success: true, error: null };
    },
    []
  );

  // ── Register as Team Leader ────────────────────────────────────────────────

  const registerAsLeader = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      teamName: string,
      teamDescription?: string
    ) => {
      const { user, error } = await signUpAsLeader(
        email,
        password,
        name,
        teamName,
        teamDescription
      );
      if (!user) return { success: false, error };

      setCurrentUser(user);

      const org = user.organizations[0];
      if (org) {
        setActiveOrgId(org.id);
        localStorage.setItem("active_org_id", org.id);
      }

      const team = user.teams[0];
      if (team) {
        setActiveTeamId(team.id);
        saveActiveTeam(team.id);
        const members = await getAllMembers(team.id);
        setAllMembers(members);
      }

      return { success: true, error: null };
    },
    []
  );

  // ── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    if (currentUser && activeTeamId) {
      try {
        await updateMemberStatus(activeTeamId, currentUser.id, "offline");
      } catch {
        // ignore
      }
    }
    await signOut();
    setCurrentUser(null);
    setAllMembers([]);
    setActiveOrgId(null);
    setActiveTeamId(null);
  }, [currentUser, activeTeamId]);

  // ── Switch team ────────────────────────────────────────────────────────────

  const switchOrg = useCallback(async (orgId: string) => {
    setActiveOrgId(orgId);
    localStorage.setItem("active_org_id", orgId);
  }, []);

  const switchTeam = useCallback(async (teamId: string) => {
    setActiveTeamId(teamId);
    saveActiveTeam(teamId);
    const members = await getAllMembers(teamId);
    setAllMembers(members);
  }, []);

  // ── Update profile ─────────────────────────────────────────────────────────

  const updateCurrentUser = useCallback(
    async (patch: Partial<Pick<TeamMember, "name" | "role" | "status">>) => {
      if (!currentUser) return;
      await updateProfile(patch);
      const updated = { ...currentUser, ...patch };
      setCurrentUser(updated as AuthUser);
      setAllMembers((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...patch } : m))
      );
    },
    [currentUser]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allMembers,
        activeOrgId,
        activeTeamId,
        myOrgs,
        myTeams,
        isLoading,
        login,
        register,
        registerAsLeader,
        logout,
        switchOrg,
        switchTeam,
        updateCurrentUser,
        refreshMembers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
