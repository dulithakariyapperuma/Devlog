import { useState, useRef, useEffect } from "react";
import { X, Minus, Send } from "lucide-react";
import { format } from "date-fns";
import type { ChatMessage, TeamMember } from "@/data/mockData";

interface Props {
    title: string;
    subtitle?: string;
    avatarText: string;
    avatarColor: string;
    messages: ChatMessage[];
    allMembers: TeamMember[];
    currentUserId: string;
    minimized: boolean;
    onSend: (text: string) => void;
    onMinimize: () => void;
    onClose: () => void;
}

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

export default function ChatWindow({
    title, subtitle, avatarText, avatarColor,
    messages, allMembers, currentUserId,
    minimized, onSend, onMinimize, onClose,
}: Props) {
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, minimized]);

    const handleSend = () => {
        const t = input.trim();
        if (!t) return;
        onSend(t);
        setInput("");
    };

    const getMemberById = (id: string) => allMembers.find((m) => m.id === id);

    return (
        <div
            className="w-72 flex flex-col rounded-t-2xl overflow-hidden shadow-2xl border border-border/50"
            style={{ background: "hsl(var(--card))" }}
        >
            {/* Header */}
            <div
                className={`flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r ${avatarColor} cursor-pointer`}
                onClick={onMinimize}
            >
                <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {avatarText}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{title}</p>
                    {subtitle && <p className="text-[10px] text-white/70 truncate">{subtitle}</p>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="text-white/70 hover:text-white transition-colors">
                    <Minus className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white/70 hover:text-white transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Body */}
            {!minimized && (
                <>
                    <div className="flex-1 h-64 overflow-y-auto px-3 py-2 space-y-2">
                        {messages.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground mt-8">No messages yet. Say hi! 👋</p>
                        )}
                        {messages.map((msg) => {
                            const isMe = msg.authorId === currentUserId;
                            const author = getMemberById(msg.authorId);
                            const authorColor = AVATAR_COLORS[parseInt(msg.authorId) % AVATAR_COLORS.length];
                            return (
                                <div key={msg.id} className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                                    {!isMe && (
                                        <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${authorColor} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
                                            {author?.avatar ?? "?"}
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] px-2.5 py-1.5 rounded-2xl text-xs leading-relaxed ${isMe
                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                : "bg-muted text-foreground rounded-bl-sm"
                                            }`}
                                    >
                                        {!isMe && <p className="text-[9px] font-semibold mb-0.5 opacity-60">{author?.name?.split(" ")[0]}</p>}
                                        <p>{msg.text}</p>
                                        <p className={`text-[9px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                            {format(msg.timestamp, "h:mm a")}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Message…"
                            className="flex-1 text-xs bg-muted/50 rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="h-7 w-7 rounded-full bg-primary flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors"
                        >
                            <Send className="h-3 w-3 text-primary-foreground" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
