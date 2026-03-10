import { useState } from "react";
import { Copy, Check, Pencil, Trash2, AlertCircle, Layers, CheckCircle2, Clock } from "lucide-react";
import type { SolutionEntry } from "@/data/mockData";
import EntryFormModal from "@/components/EntryFormModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  entry: SolutionEntry;
  side: "left" | "right";
  index: number;
  onEdit?: (entry: SolutionEntry) => void;
  onDelete?: (id: string) => void;
}

// Consistent avatar color based on author id
const AVATAR_COLORS = [
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-blue-500",
];

export default function SolutionCard({ entry, side, index, onEdit, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleCopy = () => {
    if (entry.codeSnippet) {
      navigator.clipboard.writeText(entry.codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isResolved = entry.status === "resolved";
  const avatarColor = AVATAR_COLORS[parseInt(entry.author.id) % AVATAR_COLORS.length];

  return (
    <div
      className={`w-full max-w-[26rem] solution-card-animate ${side === "left" ? "mr-auto" : "ml-auto"}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={`relative glass-card rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group card-border-accent ${isResolved ? "accent-resolved" : "accent-progress"
          }`}
      >
        {/* Top accent gradient strip */}
        <div className={`h-0.5 w-full bg-gradient-to-r ${isResolved ? "from-emerald-400/0 via-emerald-400 to-emerald-400/0" : "from-amber-400/0 via-amber-400 to-amber-400/0"}`} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-center gap-3 mb-3.5">
            {/* Glowing avatar */}
            <div className={`relative h-9 w-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-[10px] font-bold text-white shadow-lg shrink-0`}
              style={{ boxShadow: isResolved ? "0 0 12px rgba(52,211,153,0.35)" : "0 0 12px rgba(251,191,36,0.35)" }}
            >
              {entry.author.avatar}
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight truncate">
                {entry.author.name}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Developer</p>
            </div>

            {/* Status badge */}
            <div className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${isResolved ? "status-resolved" : "status-in-progress"
              }`}>
              {isResolved
                ? <CheckCircle2 className="h-3 w-3" />
                : <Clock className="h-3 w-3" />
              }
              {isResolved ? "Resolved" : "In Progress"}
            </div>
          </div>

          {/* Title + action buttons */}
          <div className="flex items-start justify-between gap-2 mb-3">
            {entry.title && (
              <h3 className="font-bold text-[15px] leading-snug text-foreground">{entry.title}</h3>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
              <button
                onClick={() => setEditOpen(true)}
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                aria-label="Edit entry"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this solution entry from the feed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete?.(entry.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Module chip */}
          <div className="flex items-center gap-1.5 mb-3">
            <Layers className="h-3 w-3 text-primary/60 shrink-0" />
            <span className="text-[11px] font-semibold text-primary/80 bg-primary/8 px-2 py-0.5 rounded-md border border-primary/12">
              {entry.module}
            </span>
          </div>

          {/* Error message block */}
          {entry.errorMessage && (
            <div className="flex gap-2 items-start bg-destructive/5 border border-destructive/15 rounded-xl px-3 py-2 mb-3">
              <AlertCircle className="h-3.5 w-3.5 text-destructive/60 shrink-0 mt-0.5" />
              <p className="text-[11px] text-destructive/80 leading-relaxed">{entry.errorMessage}</p>
            </div>
          )}

          {/* Explanation */}
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{entry.explanation}</p>

          {/* Code snippet */}
          {entry.codeSnippet && (
            <div className="relative group/code">
              <div className="code-block-fancy rounded-xl overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 border-b border-white/5">
                  <div className="h-2 w-2 rounded-full bg-rose-500/70" />
                  <div className="h-2 w-2 rounded-full bg-amber-400/70" />
                  <div className="h-2 w-2 rounded-full bg-emerald-400/70" />
                  <span className="ml-auto text-[10px] text-white/30 font-mono">bash</span>
                </div>
                <pre className="px-4 pt-2 pb-3 text-[11px] text-emerald-300/90 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {entry.codeSnippet}
                </pre>
              </div>
              <button
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/5 hover:bg-white/15 transition-colors opacity-0 group-hover/code:opacity-100"
                aria-label="Copy code"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/50" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <EntryFormModal
        entry={entry}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={(updated) => onEdit?.(updated)}
      />
    </div>
  );
}
