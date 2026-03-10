import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Project, SolutionEntry } from "@/data/mockData";
import { CheckCircle2, Clock, Layers, Search, FileCode2 } from "lucide-react";
import { format } from "date-fns";

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

export default function MySolutionsView({ projects }: Props) {
    const { currentUser } = useAuth();
    const [filter, setFilter] = useState<"all" | "resolved" | "in-progress">("all");
    const [search, setSearch] = useState("");

    // Collect all entries authored by current user, tagged with project
    const allMyEntries = useMemo(() => {
        const result: { entry: SolutionEntry; projectName: string; projectId: string }[] = [];
        projects.forEach((p) => {
            p.entries.forEach((e) => {
                if (e.author.id === currentUser?.id) {
                    result.push({ entry: e, projectName: p.name, projectId: p.id });
                }
            });
        });
        return result.sort((a, b) => b.entry.timestamp.getTime() - a.entry.timestamp.getTime());
    }, [projects, currentUser]);

    const filtered = useMemo(() => {
        return allMyEntries.filter(({ entry }) => {
            if (filter !== "all" && entry.status !== filter) return false;
            if (search.trim()) {
                const q = search.toLowerCase();
                return (
                    entry.title.toLowerCase().includes(q) ||
                    entry.module.toLowerCase().includes(q) ||
                    entry.explanation.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [allMyEntries, filter, search]);

    const resolvedCount = allMyEntries.filter((i) => i.entry.status === "resolved").length;
    const avatarColor = AVATAR_COLORS[parseInt(currentUser?.id ?? "0") % AVATAR_COLORS.length];

    return (
        <div className="py-2">
            {/* Header */}
            <div className="flex items-start gap-5 mb-8">
                <div
                    className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-sm font-bold text-white shadow-lg shrink-0`}
                >
                    {currentUser?.avatar}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{currentUser?.name}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{currentUser?.role}</p>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{allMyEntries.length}</span> entries logged
                        </span>
                        <span className="text-xs text-muted-foreground">
                            <span className="font-semibold text-emerald-400">{resolvedCount}</span> resolved
                        </span>
                        <span className="text-xs text-muted-foreground">
                            <span className="font-semibold text-amber-400">{allMyEntries.length - resolvedCount}</span> open
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter entries…"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {(["all", "resolved", "in-progress"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {f === "all" ? "All" : f === "resolved" ? "✅ Resolved" : "🔄 In Progress"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Entry list */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                    <FileCode2 className="h-10 w-10 opacity-25" />
                    <p className="text-sm">No entries match your filters.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(({ entry, projectName }) => (
                        <div
                            key={entry.id}
                            className={`glass-card rounded-2xl p-5 hover:shadow-lg transition-all duration-200 border-l-4 ${entry.status === "resolved"
                                ? "border-l-emerald-400"
                                : "border-l-amber-400"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${entry.status === "resolved" ? "status-resolved" : "status-in-progress"
                                                }`}
                                        >
                                            {entry.status === "resolved" ? (
                                                <CheckCircle2 className="h-3 w-3" />
                                            ) : (
                                                <Clock className="h-3 w-3" />
                                            )}
                                            {entry.status === "resolved" ? "Resolved" : "In Progress"}
                                        </span>
                                        <span className="text-[11px] text-primary/70 font-semibold bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-md">
                                            {projectName}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-sm text-foreground leading-snug mb-1">{entry.title}</h3>
                                    <div className="flex items-center gap-1 mb-2">
                                        <Layers className="h-3 w-3 text-primary/40" />
                                        <span className="text-[11px] text-muted-foreground">{entry.module}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{entry.explanation}</p>
                                </div>
                                <span className="text-[11px] text-muted-foreground/60 shrink-0 mt-0.5">
                                    {format(entry.timestamp, "dd MMM · h:mm a")}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
