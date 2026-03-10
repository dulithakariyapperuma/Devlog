import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderPlus, Check } from "lucide-react";
import { type Project } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

interface Props {
    project?: Project;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSubmit: (project: Project) => void;
    showTrigger?: boolean;
}

export default function ProjectFormModal({ project, open: controlledOpen, onOpenChange, onSubmit, showTrigger }: Props) {
    const { allMembers } = useAuth();
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (v: boolean) => { if (isControlled) onOpenChange?.(v); else setInternalOpen(v); };

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<"active" | "completed">("active");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [memberIds, setMemberIds] = useState<string[]>([]);

    useEffect(() => {
        if (open && project) {
            setName(project.name);
            setDescription(project.description);
            setStatus(project.status);
            setStartDate(project.startDate.toISOString().split("T")[0]);
            setEndDate(project.endDate ? project.endDate.toISOString().split("T")[0] : "");
            setMemberIds(project.memberIds ?? []);
        } else if (open && !project) {
            setName(""); setDescription(""); setStatus("active");
            setStartDate(new Date().toISOString().split("T")[0]);
            setEndDate(""); setMemberIds([]);
        }
    }, [open, project]);

    const toggleMember = (id: string) =>
        setMemberIds((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !startDate) return;
        const result: Project = {
            id: project?.id ?? crypto.randomUUID(),
            name: name.trim(), description: description.trim(), status,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            entries: project?.entries ?? [],
            memberIds,
            groupMessages: project?.groupMessages ?? [],
        };
        onSubmit(result);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {showTrigger && (
                <DialogTrigger asChild>
                    <Button className="gap-2"><FolderPlus className="h-4 w-4" />New Project</Button>
                </DialogTrigger>
            )}
            <DialogContent className="glass-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-foreground">{project ? "Edit Project" : "New Project"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. API Gateway v3" />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "completed")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>End Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>

                    {/* Team member assignment — uses live DB members */}
                    <div className="space-y-2">
                        <Label>Team Members</Label>
                        <div className="space-y-1.5">
                            {allMembers.map((m, i) => {
                                const selected = memberIds.includes(m.id);
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => toggleMember(m.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${selected
                                            ? "border-primary/50 bg-primary/5"
                                            : "border-border hover:border-primary/30 hover:bg-muted/40"
                                            }`}
                                    >
                                        <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>
                                            {m.avatar}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{m.role}</p>
                                        </div>
                                        <div className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${selected ? "bg-primary border-primary" : "border-border"
                                            }`}>
                                            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={!name.trim() || !startDate}>
                            {project ? "Save Changes" : "Create Project"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
