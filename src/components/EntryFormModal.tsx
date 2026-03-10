import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { SolutionEntry } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";

const modules = [
  "Backend / Auth-Service",
  "Backend / API Gateway",
  "Frontend / Dashboard",
  "Frontend / Components",
  "DevOps / CI-CD",
  "Database / Migrations",
];

interface Props {
  /** When provided, modal opens in edit mode */
  entry?: SolutionEntry;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (entry: SolutionEntry) => void;
  /** If true, renders its own trigger button */
  showTrigger?: boolean;
}

export default function EntryFormModal({ entry, open: controlledOpen, onOpenChange, onSubmit, showTrigger }: Props) {
  const { currentUser } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const [status, setStatus] = useState<"resolved" | "in-progress">("resolved");
  const [title, setTitle] = useState("");
  const [module, setModule] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [explanation, setExplanation] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");

  // Populate fields when editing
  useEffect(() => {
    if (open && entry) {
      setStatus(entry.status);
      setTitle(entry.title);
      setModule(entry.module);
      setErrorMessage(entry.errorMessage ?? "");
      setExplanation(entry.explanation);
      setCodeSnippet(entry.codeSnippet ?? "");
    } else if (open && !entry) {
      setStatus("resolved");
      setTitle("");
      setModule("");
      setErrorMessage("");
      setExplanation("");
      setCodeSnippet("");
    }
  }, [open, entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !module || !explanation.trim()) return;

    const result: SolutionEntry = {
      id: entry?.id ?? crypto.randomUUID(),
      author: entry?.author ?? currentUser!,
      status,
      title: title.trim(),
      module,
      errorMessage: errorMessage.trim() || undefined,
      explanation: explanation.trim(),
      codeSnippet: codeSnippet.trim() || undefined,
      timestamp: entry?.timestamp ?? new Date(),
    };

    onSubmit(result);
    setOpen(false);
  };

  const isEdit = !!entry;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="glass-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEdit ? "Edit Entry" : "New Solution Entry"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "resolved" | "in-progress")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fixed auth token loop" />
          </div>

          <div className="space-y-2">
            <Label>Error Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={errorMessage} onChange={(e) => setErrorMessage(e.target.value)} placeholder="Paste the error message" />
          </div>

          <div className="space-y-2">
            <Label>Explanation</Label>
            <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="What happened and how you fixed it" rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Code Snippet <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={codeSnippet} onChange={(e) => setCodeSnippet(e.target.value)} placeholder="Paste your code here" rows={4} className="font-mono text-xs" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!title.trim() || !module || !explanation.trim()}>
              {isEdit ? "Save Changes" : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
