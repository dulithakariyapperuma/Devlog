/**
 * src/services/chatService.ts
 * ─────────────────────────────────────────────────────
 * Chat messages — replaces Supabase realtime with polling.
 *
 * Supabase had built-in WebSocket realtime.
 * Our backend uses REST for now. Polling every 3s gives a
 * "live" feel without needing Socket.io yet.
 * (Socket.io can be added later as a drop-in upgrade.)
 */
import api from "@/lib/apiClient";
import type { ChatMessage } from "@/data/mockData";

// ── Fetch messages ────────────────────────────────────────────────────────────

export async function getChatMessages(
  teamId: string,
  projectId: string
): Promise<ChatMessage[]> {
  try {
    const { data } = await api.get<
      Array<{
        id: string;
        authorId: string;
        text: string;
        createdAt: string;
        author: { id: string; name: string; avatar: string } | null;
      }>
    >(`/teams/${teamId}/projects/${projectId}/chat`);

    return data.map((row) => ({
      id: row.id,
      authorId: row.authorId ?? row.author?.id ?? "",
      text: row.text,
      timestamp: new Date(row.createdAt),
    }));
  } catch (err) {
    console.error("[chatService] getChatMessages:", err);
    return [];
  }
}

// ── Send message ──────────────────────────────────────────────────────────────

export async function sendChatMessage(
  teamId: string,
  projectId: string,
  _authorId: string,      // kept for API compat — backend uses JWT user
  text: string
): Promise<ChatMessage | null> {
  try {
    const { data } = await api.post<{
      id: string;
      authorId: string;
      text: string;
      createdAt: string;
      author: { id: string } | null;
    }>(`/teams/${teamId}/projects/${projectId}/chat`, { text });

    return {
      id: data.id,
      authorId: data.authorId ?? data.author?.id ?? "",
      text: data.text,
      timestamp: new Date(data.createdAt),
    };
  } catch (err) {
    console.error("[chatService] sendChatMessage:", err);
    return null;
  }
}

// ── Polling-based "subscription" ──────────────────────────────────────────────
/**
 * Polls for new messages every `intervalMs` milliseconds.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * This replaces Supabase's realtime WebSocket subscription.
 * Upgrade path: swap this for Socket.io later.
 */
export function subscribeToProjectChat(
  teamId: string,
  projectId: string,
  onNewMessages: (msgs: ChatMessage[]) => void,
  intervalMs = 3000
): () => void {
  let lastTimestamp = new Date().toISOString();
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const { data } = await api.get<
        Array<{ id: string; authorId: string; text: string; createdAt: string; author: { id: string } | null }>
      >(`/teams/${teamId}/projects/${projectId}/chat`, {
        params: { before: undefined },
      });

      const newMsgs = data
        .filter((m) => m.createdAt > lastTimestamp)
        .map((m) => ({
          id: m.id,
          authorId: m.authorId ?? m.author?.id ?? "",
          text: m.text,
          timestamp: new Date(m.createdAt),
        }));

      if (newMsgs.length > 0) {
        lastTimestamp = newMsgs[newMsgs.length - 1].timestamp.toISOString();
        onNewMessages(newMsgs);
      }
    } catch {
      // Network error — silently retry next poll
    }
  };

  const timer = setInterval(poll, intervalMs);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

// ── Delete message ────────────────────────────────────────────────────────────

export async function deleteChatMessage(
  teamId: string,
  projectId: string,
  msgId: string
): Promise<void> {
  await api.delete(`/teams/${teamId}/projects/${projectId}/chat/${msgId}`);
}
