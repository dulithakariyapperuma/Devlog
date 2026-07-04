/**
 * src/services/linkService.ts
 * ─────────────────────────────────────────────────────
 * Knowledge links (embedded Google Docs, Sheets, PDFs).
 * Replaces Supabase calls.
 */
import api from "@/lib/apiClient";

export type LinkType = "google_sheet" | "word_doc" | "google_doc" | "pdf" | "other";

export interface KnowledgeLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  type: LinkType;
  category: string;
  added_by_id: string;
  added_by_name: string;
  added_by_avatar: string;
  created_at: string;
}

export interface CreateLinkPayload {
  title: string;
  url: string;
  description?: string | null;
  type: LinkType;
  category: string;
}

// ── Detect link type from URL ─────────────────────────────────────────────────
export function detectLinkType(url: string): LinkType {
  const lower = url.toLowerCase();
  if (lower.includes("docs.google.com/spreadsheets")) return "google_sheet";
  if (lower.includes("docs.google.com/document")) return "google_doc";
  if (
    lower.includes("onedrive") ||
    lower.includes("sharepoint") ||
    lower.includes(".docx")
  )
    return "word_doc";
  if (lower.includes(".pdf")) return "pdf";
  return "other";
}

// ── Fetch all links ───────────────────────────────────────────────────────────
export async function getKnowledgeLinks(teamId: string): Promise<KnowledgeLink[]> {
  try {
    const { data } = await api.get<
      Array<{
        id: string;
        title: string;
        url: string;
        description: string | null;
        type: string;
        category: string;
        addedById: string;
        addedBy: { id: string; name: string; avatar: string } | null;
        createdAt: string;
      }>
    >(`/teams/${teamId}/knowledge`);

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      description: row.description,
      type: row.type as LinkType,
      category: row.category,
      added_by_id: row.addedById ?? row.addedBy?.id ?? "",
      added_by_name: row.addedBy?.name ?? "Unknown",
      added_by_avatar: row.addedBy?.avatar ?? "?",
      created_at: row.createdAt,
    }));
  } catch (err) {
    console.error("[linkService] getKnowledgeLinks:", err);
    return [];
  }
}

// ── Create a link ─────────────────────────────────────────────────────────────
export async function createKnowledgeLink(
  teamId: string,
  payload: CreateLinkPayload,
  _userId: string,
  userName: string,
  userAvatar: string
): Promise<KnowledgeLink | null> {
  try {
    const { data } = await api.post<{
      id: string;
      title: string;
      url: string;
      description: string | null;
      type: string;
      category: string;
      addedById: string;
      addedBy: { id: string; name: string; avatar: string } | null;
      createdAt: string;
    }>(`/teams/${teamId}/knowledge`, {
      title: payload.title,
      url: payload.url,
      description: payload.description ?? null,
      type: payload.type,
      category: payload.category,
    });

    return {
      id: data.id,
      title: data.title,
      url: data.url,
      description: data.description,
      type: data.type as LinkType,
      category: data.category,
      added_by_id: data.addedById ?? data.addedBy?.id ?? "",
      added_by_name: data.addedBy?.name ?? userName,
      added_by_avatar: data.addedBy?.avatar ?? userAvatar,
      created_at: data.createdAt,
    };
  } catch (err) {
    console.error("[linkService] createKnowledgeLink:", err);
    return null;
  }
}

// ── Update a link ─────────────────────────────────────────────────────────────
export async function updateKnowledgeLink(
  teamId: string,
  id: string,
  payload: Partial<CreateLinkPayload>
): Promise<boolean> {
  try {
    await api.patch(`/teams/${teamId}/knowledge/${id}`, payload);
    return true;
  } catch (err) {
    console.error("[linkService] updateKnowledgeLink:", err);
    return false;
  }
}

// ── Delete a link ─────────────────────────────────────────────────────────────
export async function deleteKnowledgeLink(
  teamId: string,
  id: string
): Promise<boolean> {
  try {
    await api.delete(`/teams/${teamId}/knowledge/${id}`);
    return true;
  } catch (err) {
    console.error("[linkService] deleteKnowledgeLink:", err);
    return false;
  }
}
