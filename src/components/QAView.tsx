import { useState, useMemo } from "react";
import {
    Bug, Plus, AlertTriangle, Flame, ChevronDown, ChevronUp,
    CheckCircle2, Clock, XCircle, Eye, Search, Filter,
    Layers, User, Calendar, SlidersHorizontal, ArrowUpRight,
    Info, ListChecks, Lightbulb, Camera, X
} from "lucide-react";
import { format } from "date-fns";
import {
    initialBugReports, teamMembers, type BugReport,
    type BugSeverity, type BugPriority, type BugStatus, type Project
} from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";

// ── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

const severityConfig: Record<BugSeverity, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
    critical: {
        label: "Critical", color: "bg-red-500/15 text-red-400 border border-red-500/25",
        dot: "bg-red-500", icon: <Flame className="h-3 w-3" />,
    },
    high: {
        label: "High", color: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
        dot: "bg-orange-400", icon: <AlertTriangle className="h-3 w-3" />,
    },
    medium: {
        label: "Medium", color: "bg-amber-400/15 text-amber-400 border border-amber-400/25",
        dot: "bg-amber-400", icon: <Info className="h-3 w-3" />,
    },
    low: {
        label: "Low", color: "bg-sky-400/15 text-sky-400 border border-sky-400/25",
        dot: "bg-sky-400", icon: <Info className="h-3 w-3" />,
    },
};

const priorityConfig: Record<BugPriority, { label: string; color: string }> = {
    urgent: { label: "🚨 Urgent", color: "text-red-400" },
    high: { label: "⬆ High", color: "text-orange-400" },
    normal: { label: "➡ Normal", color: "text-muted-foreground" },
    low: { label: "⬇ Low", color: "text-sky-400" },
};

const statusConfig: Record<BugStatus, { label: string; color: string; icon: React.ReactNode }> = {
    open: { label: "Open", color: "bg-red-500/10 text-red-400 border border-red-500/20", icon: <Bug className="h-3 w-3" /> },
    "in-review": { label: "In Review", color: "bg-amber-400/10 text-amber-400 border border-amber-400/20", icon: <Eye className="h-3 w-3" /> },
    resolved: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", icon: <CheckCircle2 className="h-3 w-3" /> },
    closed: { label: "Closed", color: "bg-muted/60 text-muted-foreground border border-border", icon: <XCircle className="h-3 w-3" /> },
};

function memberById(id: string) {
    return teamMembers.find((m) => m.id === id);
}

// ── Bug Form Modal ─────────────────────────────────────────────────────────────
interface BugFormProps {
    projects: Project[];
    onSubmit: (bug: BugReport) => void;
    onClose: () => void;
    reportedById: string;
}

function BugFormModal({ projects, onSubmit, onClose, reportedById }: BugFormProps) {
    const [form, setForm] = useState({
        title: "",
        description: "",
        stepsToReproduce: "",
        expectedBehavior: "",
        actualBehavior: "",
        severity: "high" as BugSeverity,
        priority: "high" as BugPriority,
        projectId: projects[0]?.id ?? "",
        module: "",
        assigneeId: "",
        screenshotNote: "",
    });
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim() || !form.module.trim()) {
            setError("Title, description, and module are required.");
            return;
        }
        const now = new Date();
        onSubmit({
            ...form,
            id: `bug-${Date.now()}`,
            status: "open",
            reportedById,
            timestamp: now,
            updatedAt: now,
            assigneeId: form.assigneeId || undefined,
            stepsToReproduce: form.stepsToReproduce || undefined,
            expectedBehavior: form.expectedBehavior || undefined,
            actualBehavior: form.actualBehavior || undefined,
            screenshotNote: form.screenshotNote || undefined,
        });
        onClose();
    };

    const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 glass-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                            <Bug className="h-4.5 w-4.5 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">File a Bug Report</h2>
                            <p className="text-xs text-muted-foreground">Notify the dev team about an issue you found</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Bug Title *</label>
                        <input
                            className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                            placeholder="Short, descriptive title of the bug"
                            value={form.title}
                            onChange={(e) => set("title", e.target.value)}
                        />
                    </div>

                    {/* Row: project + module */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Project *</label>
                            <select
                                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                value={form.projectId}
                                onChange={(e) => set("projectId", e.target.value)}
                            >
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Module *</label>
                            <input
                                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                placeholder="e.g. Frontend / Auth"
                                value={form.module}
                                onChange={(e) => set("module", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Row: severity + priority + assignee */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Severity *</label>
                            <select
                                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                value={form.severity}
                                onChange={(e) => set("severity", e.target.value)}
                            >
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Priority *</label>
                            <select
                                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                value={form.priority}
                                onChange={(e) => set("priority", e.target.value)}
                            >
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="normal">Normal</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Assign To</label>
                            <select
                                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                value={form.assigneeId}
                                onChange={(e) => set("assigneeId", e.target.value)}
                            >
                                <option value="">Unassigned</option>
                                {teamMembers.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Description *</label>
                        <textarea
                            rows={3}
                            className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
                            placeholder="Describe the bug in detail..."
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                        />
                    </div>

                    {/* Steps to reproduce */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Steps to Reproduce</label>
                        <textarea
                            rows={3}
                            className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none font-mono transition-all"
                            placeholder={"1. Go to ...\n2. Click on ...\n3. See error"}
                            value={form.stepsToReproduce}
                            onChange={(e) => set("stepsToReproduce", e.target.value)}
                        />
                    </div>

                    {/* Expected / Actual */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Expected Behavior</label>
                            <textarea
                                rows={2}
                                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
                                placeholder="What should happen?"
                                value={form.expectedBehavior}
                                onChange={(e) => set("expectedBehavior", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Actual Behavior</label>
                            <textarea
                                rows={2}
                                className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
                                placeholder="What actually happens?"
                                value={form.actualBehavior}
                                onChange={(e) => set("actualBehavior", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Screenshot note */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Screenshot / Recording Note</label>
                        <input
                            className="w-full rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            placeholder="e.g. Shared in #qa-bugs, or device info"
                            value={form.screenshotNote}
                            onChange={(e) => set("screenshotNote", e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all shadow-lg shadow-red-500/25"
                        >
                            <Bug className="h-3.5 w-3.5" />
                            File Bug Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Bug Card ─────────────────────────────────────────────────────────────────
function BugCard({
    bug, projects, onStatusChange, onDelete,
}: {
    bug: BugReport;
    projects: Project[];
    onStatusChange: (id: string, status: BugStatus) => void;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const sev = severityConfig[bug.severity];
    const pri = priorityConfig[bug.priority];
    const sta = statusConfig[bug.status];
    const reporter = memberById(bug.reportedById);
    const assignee = bug.assigneeId ? memberById(bug.assigneeId) : null;
    const project = projects.find((p) => p.id === bug.projectId);
    const avatarColor = AVATAR_COLORS[parseInt(reporter?.id ?? "0") % AVATAR_COLORS.length];
    const assigneeColor = AVATAR_COLORS[parseInt(assignee?.id ?? "0") % AVATAR_COLORS.length];

    const nextStatusMap: Record<BugStatus, BugStatus | null> = {
        open: "in-review",
        "in-review": "resolved",
        resolved: "closed",
        closed: null,
    };
    const next = nextStatusMap[bug.status];

    return (
        <div className={`glass-card rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group
      ${bug.severity === "critical" ? "border-l-[3px] border-l-red-500/70" :
                bug.severity === "high" ? "border-l-[3px] border-l-orange-400/70" :
                    bug.severity === "medium" ? "border-l-[3px] border-l-amber-400/70" :
                        "border-l-[3px] border-l-sky-400/70"}`}
        >
            {/* Top accent strip */}
            <div className={`h-0.5 w-full bg-gradient-to-r
        ${bug.severity === "critical" ? "from-red-500/0 via-red-500 to-red-500/0" :
                    bug.severity === "high" ? "from-orange-400/0 via-orange-400 to-orange-400/0" :
                        bug.severity === "medium" ? "from-amber-400/0 via-amber-400 to-amber-400/0" :
                            "from-sky-400/0 via-sky-400 to-sky-400/0"}`}
            />

            <div className="p-5">
                {/* Row 1: reporter + status + severity */}
                <div className="flex items-center gap-3 mb-3">
                    <div
                        className={`h-8 w-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
                        title={`Reported by ${reporter?.name}`}
                    >
                        {reporter?.avatar ?? "QA"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{reporter?.name ?? "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground/70">{format(bug.timestamp, "dd MMM yyyy · HH:mm")}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${sev.color}`}>
                        {sev.icon} {sev.label}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${sta.color}`}>
                        {sta.icon} {sta.label}
                    </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-[15px] text-foreground mb-2 leading-snug">{bug.title}</h3>

                {/* Meta chips */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {project && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-primary/80 bg-primary/8 px-2 py-0.5 rounded-md border border-primary/12">
                            <Layers className="h-2.5 w-2.5" /> {project.name}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                        <Layers className="h-2.5 w-2.5" /> {bug.module}
                    </span>
                    <span className={`text-[10px] font-semibold ${pri.color}`}>{pri.label}</span>
                    {assignee && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${assigneeColor} flex items-center justify-center text-[7px] font-bold text-white`}>
                                {assignee.avatar}
                            </div>
                            {assignee.name}
                        </span>
                    )}
                    {!assignee && (
                        <span className="text-[10px] text-muted-foreground/60 italic">Unassigned</span>
                    )}
                </div>

                {/* Description excerpt */}
                <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">{bug.description}</p>

                {/* Expandable detail */}
                {expanded && (
                    <div className="mt-3 space-y-3 border-t border-border/60 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {bug.stepsToReproduce && (
                            <div className="bg-muted/30 rounded-xl p-3">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold text-foreground mb-2 uppercase tracking-wide">
                                    <ListChecks className="h-3 w-3" /> Steps to Reproduce
                                </p>
                                <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                                    {bug.stepsToReproduce}
                                </pre>
                            </div>
                        )}
                        {(bug.expectedBehavior || bug.actualBehavior) && (
                            <div className="grid grid-cols-2 gap-3">
                                {bug.expectedBehavior && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 mb-1.5 uppercase tracking-wide">
                                            <Lightbulb className="h-3 w-3" /> Expected
                                        </p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{bug.expectedBehavior}</p>
                                    </div>
                                )}
                                {bug.actualBehavior && (
                                    <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 mb-1.5 uppercase tracking-wide">
                                            <AlertTriangle className="h-3 w-3" /> Actual
                                        </p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{bug.actualBehavior}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {bug.screenshotNote && (
                            <div className="flex items-start gap-2 bg-sky-500/5 border border-sky-500/15 rounded-xl px-3 py-2">
                                <Camera className="h-3 w-3 text-sky-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-sky-400">{bug.screenshotNote}</p>
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground/50">
                            Last updated: {format(bug.updatedAt, "dd MMM yyyy · HH:mm")}
                        </p>
                    </div>
                )}

                {/* Footer actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                    >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expanded ? "Collapse" : "View Details"}
                    </button>
                    {next && (
                        <button
                            onClick={() => onStatusChange(bug.id, next)}
                            className="ml-auto flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        >
                            <ArrowUpRight className="h-3 w-3" />
                            Mark as {statusConfig[next].label}
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(bug.id)}
                        className={`${next ? "" : "ml-auto"} p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all`}
                        title="Delete bug report"
                    >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main QAView ───────────────────────────────────────────────────────────────
export default function QAView({ projects }: { projects: Project[] }) {
    const { currentUser } = useAuth();
    const [bugs, setBugs] = useState<BugReport[]>(initialBugReports);
    const [formOpen, setFormOpen] = useState(false);
    const [searchQ, setSearchQ] = useState("");
    const [filterStatus, setFilterStatus] = useState<BugStatus | "all">("all");
    const [filterSeverity, setFilterSeverity] = useState<BugSeverity | "all">("all");
    const [filterProject, setFilterProject] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"newest" | "severity" | "priority">("newest");

    const handleAdd = (bug: BugReport) => setBugs((p) => [bug, ...p]);
    const handleStatusChange = (id: string, status: BugStatus) =>
        setBugs((p) => p.map((b) => b.id === id ? { ...b, status, updatedAt: new Date() } : b));
    const handleDelete = (id: string) => setBugs((p) => p.filter((b) => b.id !== id));

    const filtered = useMemo(() => {
        let list = [...bugs];
        if (searchQ.trim()) {
            const q = searchQ.toLowerCase();
            list = list.filter((b) =>
                b.title.toLowerCase().includes(q) ||
                b.description.toLowerCase().includes(q) ||
                b.module.toLowerCase().includes(q)
            );
        }
        if (filterStatus !== "all") list = list.filter((b) => b.status === filterStatus);
        if (filterSeverity !== "all") list = list.filter((b) => b.severity === filterSeverity);
        if (filterProject !== "all") list = list.filter((b) => b.projectId === filterProject);

        const sevOrder: BugSeverity[] = ["critical", "high", "medium", "low"];
        const priOrder: BugPriority[] = ["urgent", "high", "normal", "low"];
        if (sortBy === "newest") list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (sortBy === "severity") list.sort((a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity));
        if (sortBy === "priority") list.sort((a, b) => priOrder.indexOf(a.priority) - priOrder.indexOf(b.priority));
        return list;
    }, [bugs, searchQ, filterStatus, filterSeverity, filterProject, sortBy]);

    // Stats
    const openCount = bugs.filter((b) => b.status === "open").length;
    const inReviewCount = bugs.filter((b) => b.status === "in-review").length;
    const resolvedCount = bugs.filter((b) => b.status === "resolved").length;
    const criticalCount = bugs.filter((b) => b.severity === "critical" && b.status === "open").length;

    return (
        <div className="space-y-6">
            {formOpen && currentUser && (
                <BugFormModal
                    projects={projects}
                    onSubmit={handleAdd}
                    onClose={() => setFormOpen(false)}
                    reportedById={currentUser.id}
                />
            )}

            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="h-8 w-8 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                            <Bug className="h-4 w-4 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">QA Bug Tracker</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Report bugs, track their status, and keep developers informed of issues across all projects.
                    </p>
                </div>
                <button
                    id="qa-file-bug-btn"
                    onClick={() => setFormOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all shadow-lg shadow-red-500/25 shrink-0"
                >
                    <Plus className="h-4 w-4" />
                    File Bug Report
                </button>
            </div>

            {/* Critical alert banner */}
            {criticalCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 animate-pulse">
                    <Flame className="h-4 w-4 text-red-400 shrink-0" />
                    <p className="text-sm font-semibold text-red-400">
                        {criticalCount} critical bug{criticalCount > 1 ? "s" : ""} open — immediate developer attention required!
                    </p>
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Open", value: openCount, icon: <Bug className="h-4 w-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                    { label: "In Review", value: inReviewCount, icon: <Eye className="h-4 w-4" />, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
                    { label: "Resolved", value: resolvedCount, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                    { label: "Total Filed", value: bugs.length, icon: <SlidersHorizontal className="h-4 w-4" />, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
                ].map((s) => (
                    <div key={s.label} className={`glass-card rounded-xl p-4 border ${s.bg}`}>
                        <div className={`flex items-center gap-2 ${s.color} mb-1`}>
                            {s.icon}
                            <span className="text-xs font-semibold">{s.label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card rounded-xl p-3 flex flex-wrap gap-3 items-center">
                {/* Search */}
                <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-muted/40 rounded-lg px-3 py-2 border border-border">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                        className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none flex-1"
                        placeholder="Search bugs..."
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                    />
                </div>

                {/* Status filter */}
                <select
                    className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as BugStatus | "all")}
                >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in-review">In Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>

                {/* Severity filter */}
                <select
                    className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value as BugSeverity | "all")}
                >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                {/* Project filter */}
                <select
                    className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                >
                    <option value="all">All Projects</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                {/* Sort */}
                <select
                    className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                    <option value="newest">Newest First</option>
                    <option value="severity">By Severity</option>
                    <option value="priority">By Priority</option>
                </select>

                <span className="text-xs text-muted-foreground ml-auto">
                    {filtered.length} bug{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Bug list */}
            {filtered.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {filtered.map((bug) => (
                        <BugCard
                            key={bug.id}
                            bug={bug}
                            projects={projects}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-56 text-muted-foreground gap-3">
                    <Bug className="h-10 w-10 opacity-20" />
                    <p className="text-sm">{searchQ || filterStatus !== "all" || filterSeverity !== "all" || filterProject !== "all"
                        ? "No bugs match your filters."
                        : "No bugs filed yet — great news! 🎉"
                    }</p>
                </div>
            )}
        </div>
    );
}
