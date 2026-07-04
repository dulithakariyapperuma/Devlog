import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
  if (lower.includes("onedrive") || lower.includes("sharepoint") || lower.includes(".docx"))
    return "word_doc";
  if (lower.includes(".pdf")) return "pdf";
  return "other";
}

// ── Fetch all links ───────────────────────────────────────────────────────────
export async function getKnowledgeLinks(): Promise<KnowledgeLink[]> {
  if (!isSupabaseConfigured) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("knowledge_links")
    .select(
      `id, title, url, description, type, category, created_at, added_by_id,
       profiles:added_by_id ( name, avatar )`
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[linkService] getKnowledgeLinks:", error.message);
    return [];
  }

  return (data ?? []).map((row: {
    id: string;
    title: string;
    url: string;
    description: string | null;
    type: string;
    category: string;
    added_by_id: string;
    created_at: string;
    profiles: { name: string; avatar: string } | null;
  }) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    type: row.type as LinkType,
    category: row.category,
    added_by_id: row.added_by_id,
    added_by_name: (row.profiles as { name: string; avatar: string } | null)?.name ?? "Unknown",
    added_by_avatar: (row.profiles as { name: string; avatar: string } | null)?.avatar ?? "?",
    created_at: row.created_at,
  }));
}

// ── Create a link ─────────────────────────────────────────────────────────────
export async function createKnowledgeLink(
  payload: CreateLinkPayload,
  userId: string,
  userName: string,
  userAvatar: string
): Promise<KnowledgeLink | null> {
  if (!isSupabaseConfigured) {
    return {
      id: crypto.randomUUID(),
      ...payload,
      description: payload.description ?? null,
      added_by_id: userId,
      added_by_name: userName,
      added_by_avatar: userAvatar,
      created_at: new Date().toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("knowledge_links")
    .insert({
      title: payload.title,
      url: payload.url,
      description: payload.description ?? null,
      type: payload.type,
      category: payload.category,
      added_by_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("[linkService] createKnowledgeLink:", error.message);
    return null;
  }

  return {
    id: data?.id,
    title: data?.title,
    url: data?.url,
    description: data?.description,
    type: data?.type as LinkType,
    category: data?.category,
    added_by_id: data?.added_by_id,
    added_by_name: userName,
    added_by_avatar: userAvatar,
    created_at: data?.created_at,
  };
}

// ── Update a link ─────────────────────────────────────────────────────────────
export async function updateKnowledgeLink(
  id: string,
  payload: Partial<CreateLinkPayload>
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("knowledge_links")
    .update({
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.url !== undefined && { url: payload.url }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.type !== undefined && { type: payload.type }),
      ...(payload.category !== undefined && { category: payload.category }),
    })
    .eq("id", id);

  if (error) {
    console.error("[linkService] updateKnowledgeLink:", error.message);
    return false;
  }
  return true;
}

// ── Delete a link ─────────────────────────────────────────────────────────────
export async function deleteKnowledgeLink(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("knowledge_links")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[linkService] deleteKnowledgeLink:", error.message);
    return false;
  }
  return true;
}
