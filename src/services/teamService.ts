import api from "@/lib/apiClient";
import type { TeamInfo } from "./authService";

export async function createTeam(name: string, organizationId: string, description?: string): Promise<{ team: TeamInfo | null; error: string | null }> {
  try {
    const { data } = await api.post<TeamInfo>("/teams", {
      name,
      organizationId,
      description,
    });
    return { team: data, error: null };
  } catch (err: any) {
    const errorData = err.response?.data?.error;
    let msg = err.message || "Failed to create team";
    if (typeof errorData === "string") {
      msg = errorData;
    } else if (typeof errorData === "object" && errorData !== null) {
      msg = Object.values(errorData).flat().join(", ");
    }
    return { team: null, error: msg };
  }
}

export async function getOrgTeams(orgId: string): Promise<any[]> {
  try {
    const { data } = await api.get(`/organizations/${orgId}/teams`);
    return data;
  } catch (err) {
    console.error("Failed to fetch org teams:", err);
    return [];
  }
}

export async function updateTeam(teamId: string, name: string, description?: string): Promise<boolean> {
  try {
    await api.patch(`/teams/${teamId}`, { name, description });
    return true;
  } catch (err) {
    return false;
  }
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    await api.delete(`/teams/${teamId}`);
    return true;
  } catch (err) {
    return false;
  }
}

export async function getTeamMembers(teamId: string): Promise<any[]> {
  try {
    const { data } = await api.get(`/teams/${teamId}/members`);
    return data;
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    return [];
  }
}

export async function removeTeamMember(teamId: string, userId: string): Promise<boolean> {
  try {
    await api.delete(`/teams/${teamId}/members/${userId}`);
    return true;
  } catch (err) {
    console.error("Failed to remove team member:", err);
    return false;
  }
}
