import { useMemo, useState } from "react";
import type { Project, SolutionEntry } from "@/data/mockData";
import { Search, Layers, CheckCircle2, Clock, FolderKanban } from "lucide-react";
import { format } from "date-fns";

interface Props {
    projects: Project[];
    onViewProject?: (project: Project) => void;
}

function highlight(text: string, query: string) {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-primary/25 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
}

export default function SearchView({ projects, onViewProject }: Props) {
    const [query, setQuery] = useState("");

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        const out: { entry: SolutionEntry; project: Project }[] = [];
        projects.forEach((p) => {
            p.entries.forEach((e) => {
                if (
                    e.title.toLowerCase().includes(q) ||
                    e.module.toLowerCase().includes(q) ||
                    e.explanation.toLowerCase().includes(q) ||
                    e.errorMessage?.toLowerCase().includes(q) ||
                    e.author.name.toLowerCase().includes(q)
                ) {
                    out.push({ entry: e, project: p });
                }
            });
        });
        return out.sort((a, b) => b.entry.timestamp.getTime() - a.entry.timestamp.getTime());
    }, [query, projects]);

    // Group by project
    const grouped = useMemo(() => {
        const map = new Map<string, { project: Project; entries: SolutionEntry[] }>();
        results.forEach(({ entry, project }) => {
            if (!map.has(project.id)) map.set(project.id, { project, entries: [] });
            map.get(project.id)!.entries.push(entry);
        });
        return [...map.values()];
    }, [results]);

    return (
        <div className="py-2">
            <h1 className="text-2xl font-bold text-foreground mb-2">Search</h1>
            <p className="text-sm text-muted-foreground mb-6">Search across all projects and entries</p>

            {/* Big search bar */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title, module, error, author…"
                    className="w-full pl-12 pr-5 py-4 text-base bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground shadow-sm"
                />
                {query && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {results.length} result{results.length !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            {/* Empty state */}
            {!query.trim() && (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Start typing to search across all your projects.</p>
                </div>
            )}

            {query.trim() && results.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No results for "{query}"</p>
                </div>
            )}

            {/* Grouped results */}
            <div className="space-y-8">
                {grouped.map(({ project, entries }) => (
                    <div key={project.id}>
                        {/* Project header */}
                        <button
                            onClick={() => onViewProject?.(project)}
                            className="flex items-center gap-2 mb-3 group"
                        >
                            <FolderKanban className="h-4 w-4 text-primary/60" />
                            <span className="text-sm font-semibold text-primary hover:underline underline-offset-2">
                                {project.name}
                            </span>
                            <span className="text-xs text-muted-foreground">({entries.length})</span>
                        </button>

                        <div className="space-y-2.5">
                            {entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className={`glass-card rounded-xl p-4 border-l-4 ${entry.status === "resolved" ? "border-l-emerald-400" : "border-l-amber-400"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${entry.status === "resolved" ? "status-resolved" : "status-in-progress"
                                                        }`}
                                                >
                                                    {entry.status === "resolved" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                    {entry.status === "resolved" ? "Resolved" : "In Progress"}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Layers className="h-3 w-3 text-primary/40" />
                                                    <span className="text-[11px] text-muted-foreground">{highlight(entry.module, query)}</span>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-sm text-foreground mb-0.5">
                                                {highlight(entry.title, query)}
                                            </h4>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {highlight(entry.explanation, query)}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[11px] text-muted-foreground/60">{format(entry.timestamp, "dd MMM")}</p>
                                            <p className="text-[10px] text-muted-foreground/40 mt-0.5">{entry.author.name.split(" ")[0]}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
