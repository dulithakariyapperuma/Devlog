/**
 * src/services/adminService.ts
 * ─────────────────────────────────────────────────────
 * Super admin operations — replaces Supabase admin calls.
 */
import api from "@/lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  userCount: number;
  teamCount: number;
  projectCount: number;
  entryCount: number;
  bugCount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  globalRole: "SUPER_ADMIN" | null;
  createdAt: string;
  teams: Array<{ id: string; name: string; role: string }>;
}

export interface AdminTeam {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  teamLeader: { id: string; name: string; email: string } | null;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats | null> {
  try {
    const { data } = await api.get<AdminStats>("/admin/stats");
    return data;
  } catch {
    return null;
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getAdminUsers(
  page = 1
): Promise<{ data: AdminUser[]; total: number; totalPages: number }> {
  try {
    const { data } = await api.get<{
      data: AdminUser[];
      total: number;
      page: number;
      totalPages: number;
    }>("/admin/users", { params: { page } });
    return data;
  } catch {
    return { data: [], total: 0, totalPages: 0 };
  }
}

export async function promoteToSuperAdmin(userId: string): Promise<boolean> {
  try {
    await api.patch(`/admin/users/${userId}`, { globalRole: "SUPER_ADMIN" });
    return true;
  } catch {
    return false;
  }
}

export async function demoteFromSuperAdmin(userId: string): Promise<boolean> {
  try {
    await api.patch(`/admin/users/${userId}`, { globalRole: "MEMBER" });
    return true;
  } catch {
    return false;
  }
}

export async function deleteUser(userId: string): Promise<{ error: string | null }> {
  try {
    await api.delete(`/admin/users/${userId}`);
    return { error: null };
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ?? "Failed to delete user";
    return { error: msg };
  }
}

// Kept for backward compatibility with AdminDashboard component
export async function removeMember(userId: string): Promise<{ error: string | null }> {
  return deleteUser(userId);
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function getAdminTeams(
  page = 1
): Promise<{ data: AdminTeam[]; total: number; totalPages: number }> {
  try {
    const { data } = await api.get<{
      data: AdminTeam[];
      total: number;
      page: number;
      totalPages: number;
    }>("/admin/teams", { params: { page } });
    return data;
  } catch {
    return { data: [], total: 0, totalPages: 0 };
  }
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    await api.delete(`/admin/teams/${teamId}`);
    return true;
  } catch {
    return false;
  }
}

export async function createTeamByAdmin(opts: {
  teamName: string;
  teamDescription?: string;
  leaderId?: string;
  leaderEmail?: string;
  leaderName?: string;
  leaderPassword?: string;
}): Promise<boolean> {
  try {
    await api.post("/admin/teams", opts);
    return true;
  } catch {
    return false;
  }
}
