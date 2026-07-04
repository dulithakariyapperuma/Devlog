import api from "@/lib/apiClient";

export interface Invite {
  id: string;
  organizationId: string;
  teamId: string | null;
  role: string;
  status: string;
  expiresAt: string;
  tokenHash?: string;
  createdAt: string;
}

export async function generateInvite(teamId: string, role: "TEAM_MEMBER" | "TEAM_ADMIN"): Promise<{ token: string | null; error: string | null }> {
  try {
    const { data } = await api.post<{ token: string }>(`/invites/generate`, {
      teamId,
      role,
    });
    return { token: data.token, error: null };
  } catch (err: any) {
    const error = err.response?.data?.error || "Failed to generate invite";
    return { token: null, error };
  }
}

export async function validateInvite(token: string): Promise<{ data: any | null; error: string | null }> {
  try {
    const { data } = await api.get(`/invites/validate/${token}`);
    return { data, error: null };
  } catch (err: any) {
    const error = err.response?.data?.error || "Invalid or expired invite";
    return { data: null, error };
  }
}

export async function acceptInvite(token: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await api.post(`/invites/accept/${token}`);
    return { success: true, error: null };
  } catch (err: any) {
    const error = err.response?.data?.error || "Failed to accept invite";
    return { success: false, error };
  }
}
