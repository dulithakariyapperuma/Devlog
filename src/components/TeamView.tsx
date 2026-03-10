import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { Wifi, WifiOff, Clock3, FolderKanban, Pencil, MessageCircle, Trash2 } from "lucide-react";
import type { Project } from "@/data/mockData";
import EditProfileModal from "./EditProfileModal";
import { removeMember } from "@/services/adminService";

interface Props {
    projects: Project[];
    onViewProject?: (project: Project) => void;
}

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

const STATUS_CONFIG = {
    online: { label: "Online", icon: Wifi, dot: "bg-emerald-400" },
    away: { label: "Away", icon: Clock3, dot: "bg-amber-400" },
    offline: { label: "Offline", icon: WifiOff, dot: "bg-muted-foreground/40" },
};

export default function TeamView({ projects, onViewProject }: Props) {
    const { currentUser, allMembers, refreshMembers } = useAuth();
    const { openDM } = useChat();
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const isAdmin = currentUser?.isAdmin === true;

    // Map memberId → assigned projects
    const memberProjects = new Map<string, Project[]>();
    allMembers.forEach((m) => memberProjects.set(m.id, []));
    projects.forEach((p) => {
        p.memberIds.forEach((mid) => {
            if (memberProjects.has(mid)) memberProjects.get(mid)!.push(p);
        });
    });

    const onlineCount = allMembers.filter((m) => m.status === "online").length;

    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Team</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {allMembers.length} engineers ·{" "}
                        <span className="text-emerald-400 font-semibold">{onlineCount} online</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {allMembers.map((member, i) => {
                    const cfg = STATUS_CONFIG[member.status];
                    const StatusIcon = cfg.icon;
                    const isMe = member.id === currentUser?.id;
                    const assigned = memberProjects.get(member.id) ?? [];
                    const totalEntries = assigned.reduce(
                        (sum, p) => sum + p.entries.filter((e) => e.author.id === member.id).length,
                        0
                    );

                    return (
                        <div
                            key={member.id}
                            className={`glass-card rounded-2xl p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative ${isMe ? "ring-1 ring-primary/30" : ""}`}
                        >
                            {/* YOU badge */}
                            {isMe && (
                                <span className="absolute top-3 right-3 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                    You
                                </span>
                            )}

                            {/* Avatar + status dot */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="relative shrink-0">
                                    <div
                                        className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-base font-bold text-white shadow-lg`}
                                    >
                                        {member.avatar}
                                    </div>
                                    <span
                                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${cfg.dot} ${member.status === "online" ? "animate-pulse" : ""}`}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-[15px] text-foreground leading-snug truncate">{member.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
                                    <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{member.email}</p>
                                </div>
                            </div>

                            {/* Status + stats */}
                            <div className="flex items-center gap-4 py-3 border-y border-border/50 mb-4">
                                <div className="flex items-center gap-1.5">
                                    <StatusIcon className={`h-3.5 w-3.5 ${member.status === "online" ? "text-emerald-400" : member.status === "away" ? "text-amber-400" : "text-muted-foreground/50"}`} />
                                    <span className={`text-xs font-semibold ${member.status === "online" ? "text-emerald-400" : member.status === "away" ? "text-amber-400" : "text-muted-foreground/50"}`}>
                                        {cfg.label}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground ml-auto">
                                    <span className="font-semibold text-foreground">{totalEntries}</span> entries
                                </div>
                            </div>

                            {/* Assigned projects */}
                            <div className="mb-4">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Projects</p>
                                {assigned.length === 0 ? (
                                    <p className="text-xs text-muted-foreground/50">No projects assigned</p>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        {assigned.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => onViewProject?.(p)}
                                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group text-left"
                                            >
                                                <FolderKanban className="h-3.5 w-3.5 shrink-0 text-primary/40 group-hover:text-primary transition-colors" />
                                                <span className="truncate group-hover:underline underline-offset-2">{p.name}</span>
                                                <span className={`ml-auto shrink-0 h-1.5 w-1.5 rounded-full ${p.status === "active" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {isMe ? (
                                    <button
                                        onClick={() => setEditProfileOpen(true)}
                                        className="flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit Profile
                                    </button>
                                ) : (
                                    member.status === "online" && (
                                        <button
                                            onClick={() => openDM(member.id)}
                                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            Message
                                        </button>
                                    )
                                )}
                                {/* Admin: remove user button */}
                                {isAdmin && !isMe && (
                                    <button
                                        disabled={removingId === member.id}
                                        onClick={async () => {
                                            if (!confirm(`Remove ${member.name} from DevLog?`)) return;
                                            setRemovingId(member.id);
                                            await removeMember(member.id);
                                            await refreshMembers();
                                            setRemovingId(null);
                                        }}
                                        className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                        title="Remove user (admin only)"
                                    >
                                        {removingId === member.id
                                            ? <span className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                            : <Trash2 className="h-3.5 w-3.5" />}
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />
        </div>
    );
}
