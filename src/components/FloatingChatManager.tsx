import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import ChatWindow from "./ChatWindow";
import type { Project } from "@/data/mockData";
import { MessageCircle, Users } from "lucide-react";

interface Props {
    projects: Project[];
}

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

export default function FloatingChatManager({ projects }: Props) {
    const { currentUser, allMembers } = useAuth();
    const { dms, groupChats, openDM, closeDM, toggleMinimizeDM, sendDM, closeGroupChat, toggleMinimizeGroup, sendGroupMessage } = useChat();

    if (!currentUser) return null;

    // Online members excluding self
    const onlineOthers = allMembers.filter((m) => m.id !== currentUser.id && m.status === "online");

    const openDMs = Object.values(dms);
    const openGroups = Object.values(groupChats);
    const totalWindows = openDMs.length + openGroups.length;

    return (
        <div
            className="fixed bottom-0 right-6 z-50 flex flex-col items-end gap-0"
            style={{ pointerEvents: "none" }}
        >
            {/* Chat windows row */}
            <div className="flex items-end gap-3 mb-0 flex-wrap-reverse justify-end" style={{ pointerEvents: "all" }}>
                {/* DM windows */}
                {openDMs.map((dm) => {
                    const member = allMembers.find((m) => m.id === dm.memberId);
                    if (!member) return null;
                    const color = AVATAR_COLORS[parseInt(member.id) % AVATAR_COLORS.length];
                    return (
                        <ChatWindow
                            key={`dm-${dm.memberId}`}
                            title={member.name}
                            subtitle={member.role}
                            avatarText={member.avatar}
                            avatarColor={color}
                            messages={dm.messages}
                            allMembers={allMembers}
                            currentUserId={currentUser.id}
                            minimized={dm.minimized}
                            onSend={(text) => sendDM(dm.memberId, currentUser.id, text)}
                            onMinimize={() => toggleMinimizeDM(dm.memberId)}
                            onClose={() => closeDM(dm.memberId)}
                        />
                    );
                })}

                {/* Group chat windows */}
                {openGroups.map((gc) => {
                    const project = projects.find((p) => p.id === gc.projectId);
                    if (!project) return null;
                    const colorIdx = projects.indexOf(project) % AVATAR_COLORS.length;
                    return (
                        <ChatWindow
                            key={`group-${gc.projectId}`}
                            title={project.name}
                            subtitle="Project Chat"
                            avatarText={<Users className="h-3.5 w-3.5 text-white" /> as unknown as string}
                            avatarColor={AVATAR_COLORS[colorIdx]}
                            messages={gc.messages}
                            allMembers={allMembers}
                            currentUserId={currentUser.id}
                            minimized={gc.minimized}
                            onSend={(text) => sendGroupMessage(gc.projectId, currentUser.id, text)}
                            onMinimize={() => toggleMinimizeGroup(gc.projectId)}
                            onClose={() => closeGroupChat(gc.projectId)}
                        />
                    );
                })}
            </div>

            {/* Online members bar */}
            {onlineOthers.length > 0 && (
                <div
                    className="hidden md:flex glass-card rounded-t-2xl px-4 py-2.5 items-center gap-2.5 border border-border/50 border-b-0 shadow-xl"
                    style={{ pointerEvents: "all" }}
                >
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-1.5">
                        {onlineOthers.map((m) => {
                            const color = AVATAR_COLORS[parseInt(m.id) % AVATAR_COLORS.length];
                            const isOpen = !!dms[m.id];
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => openDM(m.id)}
                                    title={`Chat with ${m.name}`}
                                    className={`relative h-8 w-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[9px] font-bold text-white hover:scale-110 transition-transform shadow-md ${isOpen ? "ring-2 ring-primary ring-offset-1" : ""}`}
                                >
                                    {m.avatar}
                                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-card" />
                                </button>
                            );
                        })}
                    </div>
                    {totalWindows > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-1">{totalWindows} open</span>
                    )}
                </div>
            )}
        </div>
    );
}
