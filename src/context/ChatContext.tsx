import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { ChatMessage, Project } from "@/data/mockData";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getChatMessages, sendChatMessage, subscribeToProjectChat } from "@/services/chatService";
import { useAuth } from "@/context/AuthContext";

interface DMConversation {
    memberId: string;
    messages: ChatMessage[];
    minimized: boolean;
}

interface GroupChatWindow {
    projectId: string;
    projectName: string;
    messages: ChatMessage[];
    minimized: boolean;
    loaded: boolean;
}

interface ChatContextValue {
    dms: Record<string, DMConversation>;
    groupChats: Record<string, GroupChatWindow>;
    openDM: (memberId: string) => void;
    closeDM: (memberId: string) => void;
    toggleMinimizeDM: (memberId: string) => void;
    sendDM: (memberId: string, authorId: string, text: string) => void;
    openGroupChat: (project: Project) => void;
    closeGroupChat: (projectId: string) => void;
    toggleMinimizeGroup: (projectId: string) => void;
    sendGroupMessage: (projectId: string, authorId: string, text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
    const { allMembers } = useAuth();
    const [dms, setDMs] = useState<Record<string, DMConversation>>({});
    const [groupChats, setGroupChats] = useState<Record<string, GroupChatWindow>>({});

    // ── DM helpers (always in-memory / local only) ──────────────────────────────
    const openDM = (memberId: string) => {
        setDMs((prev) => ({
            ...prev,
            [memberId]: prev[memberId]
                ? { ...prev[memberId], minimized: false }
                : { memberId, messages: [], minimized: false },
        }));
    };

    const closeDM = (memberId: string) =>
        setDMs((prev) => { const n = { ...prev }; delete n[memberId]; return n; });

    const toggleMinimizeDM = (memberId: string) =>
        setDMs((prev) => ({
            ...prev,
            [memberId]: { ...prev[memberId], minimized: !prev[memberId]?.minimized },
        }));

    const sendDM = (memberId: string, authorId: string, text: string) => {
        const msg: ChatMessage = { id: crypto.randomUUID(), authorId, text, timestamp: new Date() };
        setDMs((prev) => ({
            ...prev,
            [memberId]: {
                ...(prev[memberId] ?? { memberId, minimized: false }),
                messages: [...(prev[memberId]?.messages ?? []), msg],
            },
        }));
    };

    // ── Group chat — backed by Supabase when configured ─────────────────────────
    const openGroupChat = useCallback(async (project: Project) => {
        // Open the window immediately (unminimized)
        let alreadyLoaded = false;
        setGroupChats((prev) => {
            const existing = prev[project.id];
            if (existing) {
                alreadyLoaded = existing.loaded;
                return { ...prev, [project.id]: { ...existing, minimized: false } };
            }
            return {
                ...prev,
                [project.id]: { projectId: project.id, projectName: project.name, messages: [], minimized: false, loaded: false },
            };
        });

        // Load history from Supabase only if not yet loaded
        if (!isSupabaseConfigured || alreadyLoaded) return;

        const history = await getChatMessages(project.id);

        setGroupChats((prev) => ({
            ...prev,
            [project.id]: {
                ...(prev[project.id] ?? { projectId: project.id, projectName: project.name, minimized: false }),
                messages: history,
                loaded: true,
            },
        }));
    }, [allMembers]);

    // ── Realtime subscription for open group chats ──────────────────────────────
    // Stable key: only changes when the set of open project IDs changes
    const openProjectIdsKey = useMemo(
        () => Object.keys(groupChats).sort().join(","),
        [groupChats]
    );

    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const openProjectIds = Object.keys(groupChats);
        if (openProjectIds.length === 0) return;

        const membersMap = new Map(allMembers.map((m) => [m.id, m]));

        const unsubs = openProjectIds.map((projectId) =>
            subscribeToProjectChat(projectId, membersMap, (msg) => {
                setGroupChats((prev) => {
                    const gc = prev[projectId];
                    if (!gc) return prev;
                    // Dedup: ignore if any message with this real id already exists,
                    // OR if there's a temp optimistic message with the same text+author within 5s
                    const isDuplicate = gc.messages.some((m) =>
                        m.id === msg.id ||
                        (m.id.startsWith("temp-") &&
                            m.authorId === msg.authorId &&
                            m.text === msg.text &&
                            Math.abs(m.timestamp.getTime() - msg.timestamp.getTime()) < 5000)
                    );
                    if (isDuplicate) return prev;
                    return {
                        ...prev,
                        [projectId]: { ...gc, messages: [...gc.messages, msg] },
                    };
                });
            })
        );

        return () => unsubs.forEach((fn) => fn());
    }, [openProjectIdsKey, allMembers]);

    const closeGroupChat = (projectId: string) =>
        setGroupChats((prev) => { const n = { ...prev }; delete n[projectId]; return n; });

    const toggleMinimizeGroup = (projectId: string) =>
        setGroupChats((prev) => ({
            ...prev,
            [projectId]: { ...prev[projectId], minimized: !prev[projectId]?.minimized },
        }));

    const sendGroupMessage = async (projectId: string, authorId: string, text: string) => {
        if (!isSupabaseConfigured) {
            // Mock: add locally
            const msg: ChatMessage = { id: crypto.randomUUID(), authorId, text, timestamp: new Date() };
            setGroupChats((prev) => ({
                ...prev,
                [projectId]: {
                    ...(prev[projectId] ?? { projectId, projectName: projectId, minimized: false, loaded: true }),
                    messages: [...(prev[projectId]?.messages ?? []), msg],
                },
            }));
            return;
        }


        // Optimistic: add immediately with a temp id
        const tempId = `temp-${crypto.randomUUID()}`;
        const optimistic: ChatMessage = { id: tempId, authorId, text, timestamp: new Date() };
        setGroupChats((prev) => ({
            ...prev,
            [projectId]: {
                ...(prev[projectId] ?? { projectId, projectName: projectId, minimized: false, loaded: true }),
                messages: [...(prev[projectId]?.messages ?? []), optimistic],
            },
        }));

        const saved = await sendChatMessage(projectId, authorId, text);
        if (saved) {
            // Replace the temp message with the real one
            setGroupChats((prev) => ({
                ...prev,
                [projectId]: {
                    ...prev[projectId],
                    messages: prev[projectId].messages.map((m) =>
                        m.id === tempId ? saved : m
                    ),
                },
            }));
        }
    };

    return (
        <ChatContext.Provider
            value={{
                dms, groupChats,
                openDM, closeDM, toggleMinimizeDM, sendDM,
                openGroupChat, closeGroupChat, toggleMinimizeGroup, sendGroupMessage,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChat must be used inside ChatProvider");
    return ctx;
}
