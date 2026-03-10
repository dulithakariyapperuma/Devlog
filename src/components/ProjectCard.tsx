import { useState } from "react";
import { format } from "date-fns";
import {
    CalendarRange, CheckCircle2, Zap, Layers, ArrowRight, Pencil, Trash2,
} from "lucide-react";
import { teamMembers, type Project } from "@/data/mockData";
import ProjectFormModal from "./ProjectFormModal";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
    project: Project;
    index: number;
    onView: (project: Project) => void;
    onEdit: (project: Project) => void;
    onDelete: (id: string) => void;
}

const CARD_ACCENTS = [
    "from-violet-500/20 to-indigo-500/10",
    "from-emerald-500/20 to-teal-500/10",
    "from-rose-500/20 to-pink-500/10",
    "from-amber-500/20 to-orange-500/10",
    "from-sky-500/20 to-blue-500/10",
];
const CARD_DOTS = ["bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-sky-500"];
const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

export default function ProjectCard({ project, index, onView, onEdit, onDelete }: Props) {
    const [editOpen, setEditOpen] = useState(false);

    const resolvedCount = project.entries.filter((e) => e.status === "resolved").length;
    const inProgressCount = project.entries.filter((e) => e.status === "in-progress").length;
    const isCompleted = project.status === "completed";
    const assignedMembers = teamMembers.filter((m) => project.memberIds.includes(m.id));

    return (
        <>
            <div
                className="group glass-card rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                onClick={() => onView(project)}
            >
                <div className={`h-1.5 w-full bg-gradient-to-r ${CARD_ACCENTS[index % CARD_ACCENTS.length]} opacity-80`} />

                <div className="p-6 flex flex-col flex-1">
                    {/* Name + status */}
                    <div className="flex items-start gap-3 mb-3">
                        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${CARD_DOTS[index % CARD_DOTS.length]} ${!isCompleted ? "animate-pulse" : ""}`} />
                        <h3 className="font-bold text-[15px] text-foreground leading-snug flex-1 truncate">{project.name}</h3>
                        <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${isCompleted ? "status-resolved" : "status-in-progress"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                            {isCompleted ? "Completed" : "Active"}
                        </div>
                    </div>

                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 line-clamp-2">{project.description}</p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Layers className="h-3.5 w-3.5 text-primary/50" />
                            <span><span className="font-semibold text-foreground">{project.entries.length}</span> entries</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px]">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="text-muted-foreground"><span className="font-semibold text-foreground">{resolvedCount}</span> resolved</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px]">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            <span className="text-muted-foreground"><span className="font-semibold text-foreground">{inProgressCount}</span> open</span>
                        </div>
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 mb-4">
                        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            {format(project.startDate, "dd MMM yyyy")} → {project.endDate ? format(project.endDate, "dd MMM yyyy") : "Ongoing"}
                        </span>
                    </div>

                    {/* Member avatars */}
                    {assignedMembers.length > 0 && (
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex -space-x-2">
                                {assignedMembers.slice(0, 5).map((m, mi) => (
                                    <div
                                        key={m.id}
                                        title={m.name}
                                        className={`h-7 w-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[parseInt(m.id) % AVATAR_COLORS.length]} flex items-center justify-center text-[9px] font-bold text-white border-2 border-card`}
                                    >
                                        {m.avatar}
                                    </div>
                                ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground/60">
                                {assignedMembers.length} member{assignedMembers.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setEditOpen(true)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently remove "{project.name}" and all its entries.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(project.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <button onClick={() => onView(project)} className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline underline-offset-2 group/btn">
                            View Feed <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            <ProjectFormModal project={project} open={editOpen} onOpenChange={setEditOpen} onSubmit={onEdit} />
        </>
    );
}
