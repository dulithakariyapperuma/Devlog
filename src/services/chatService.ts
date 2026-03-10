/**
 * chatService.ts
 * Group chat messages — with real-time subscription support.
 */
import { supabase } from "@/lib/supabase";
import type { ChatMessage, TeamMember } from "@/data/mockData";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function getChatMessages(projectId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from("chat_messages")
        .select("id, author_id, text, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
        id: row.id,
        authorId: row.author_id,
        text: row.text,
        timestamp: new Date(row.created_at),
    }));
}

// ── Send ─────────────────────────────────────────────────────────────────────

export async function sendChatMessage(
    projectId: string,
    authorId: string,
    text: string
): Promise<ChatMessage | null> {
    const { data, error } = await supabase
        .from("chat_messages")
        .insert({ project_id: projectId, author_id: authorId, text })
        .select("id, author_id, text, created_at")
        .single();

    if (error || !data) { console.error(error); return null; }

    return {
        id: data.id,
        authorId: data.author_id,
        text: data.text,
        timestamp: new Date(data.created_at),
    };
}

// ── Real-time subscription ───────────────────────────────────────────────────

/**
 * Subscribe to new chat messages for a project.
 * Returns an unsubscribe function — call it when the component unmounts.
 */
export function subscribeToProjectChat(
    projectId: string,
    membersMap: Map<string, TeamMember>,
    onNewMessage: (msg: ChatMessage) => void
): () => void {
    const channel: RealtimeChannel = supabase
        .channel(`chat:${projectId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "chat_messages",
                filter: `project_id=eq.${projectId}`,
            },
            (payload) => {
                const row = payload.new as {
                    id: string;
                    project_id: string;
                    author_id: string;
                    text: string;
                    created_at: string;
                };
                onNewMessage({
                    id: row.id,
                    authorId: row.author_id,
                    text: row.text,
                    timestamp: new Date(row.created_at),
                });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Subscribe to new solution entries for a project (for the live feed).
 */
export function subscribeToProjectEntries(
    projectId: string,
    onNewEntry: (entryId: string) => void
): () => void {
    const channel: RealtimeChannel = supabase
        .channel(`entries:${projectId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "solution_entries",
                filter: `project_id=eq.${projectId}`,
            },
            () => onNewEntry(projectId)
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
