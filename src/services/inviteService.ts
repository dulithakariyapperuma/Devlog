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

export async function generateInvite(organizationId: string, teamId: string | null, role: "TEAM_MEMBER" | "TEAM_ADMIN" | "ORG_MEMBER" | "ORG_ADMIN"): Promise<{ token: string | null; error: string | null }> {
  try {
    const { data } = await api.post<{ token: string }>(`/invites/generate`, {
      organizationId,
      teamId,
      role,
    });
    return { token: data.token, error: null };
  } catch (err: any) {
    const errorData = err.response?.data?.error;
    let msg = "Failed to generate invite";
    if (typeof errorData === "string") {
      msg = errorData;
    } else if (typeof errorData === "object" && errorData !== null) {
      msg = Object.values(errorData).flat().join(", ");
    }
    return { token: null, error: msg };
  }
}

export async function validateInvite(token: string): Promise<{ data: any | null; error: string | null }> {
  try {
    const { data } = await api.get(`/invites/validate/${token}`);
    return { data, error: null };
  } catch (err: any) {
    const errorData = err.response?.data?.error;
    let msg = "Invalid or expired invite";
    if (typeof errorData === "string") {
      msg = errorData;
    } else if (typeof errorData === "object" && errorData !== null) {
      msg = Object.values(errorData).flat().join(", ");
    }
    return { data: null, error: msg };
  }
}

export async function acceptInvite(token: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await api.post(`/invites/accept/${token}`);
    return { success: true, error: null };
  } catch (err: any) {
    const errorData = err.response?.data?.error;
    let msg = "Failed to accept invite";
    if (typeof errorData === "string") {
      msg = errorData;
    } else if (typeof errorData === "object" && errorData !== null) {
      msg = Object.values(errorData).flat().join(", ");
    }
    return { success: false, error: msg };
  }
}
