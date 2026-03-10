import type { Project, SolutionEntry } from "@/data/mockData";
import ProjectCard from "./ProjectCard";
import ProjectFormModal from "./ProjectFormModal";
import { FolderKanban } from "lucide-react";

interface Props {
    projects: Project[];
    onView: (project: Project) => void;
    onAdd: (project: Project) => void;
    onEdit: (project: Project) => void;
    onDelete: (id: string) => void;
}

export default function ProjectsView({ projects, onView, onAdd, onEdit, onDelete }: Props) {
    const active = projects.filter((p) => p.status === "active");
    const completed = projects.filter((p) => p.status === "completed");

    return (
        <div className="py-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Projects</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {projects.length} project{projects.length !== 1 ? "s" : ""} · {active.length} active
                    </p>
                </div>
                <ProjectFormModal onSubmit={onAdd} showTrigger />
            </div>

            {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                    <FolderKanban className="h-12 w-12 opacity-30" />
                    <div className="text-center">
                        <p className="font-semibold">No projects yet</p>
                        <p className="text-sm mt-1">Create your first project to get started.</p>
                    </div>
                </div>
            )}

            {/* Active projects */}
            {active.length > 0 && (
                <section className="mb-10">
                    <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Active
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {active.map((project, i) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                index={i}
                                onView={onView}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Completed projects */}
            {completed.length > 0 && (
                <section>
                    <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Completed
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {completed.map((project, i) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                index={active.length + i}
                                onView={onView}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
