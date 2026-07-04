import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileSpreadsheet, FileText, FileType2, Link2, Plus, Pencil, Trash2,
  ExternalLink, Search, X, ChevronDown, BookOpen, Copy, Check, Globe,
  Tag, Layers,
} from "lucide-react";
import {
  KnowledgeLink, LinkType, CreateLinkPayload,
  getKnowledgeLinks, createKnowledgeLink, updateKnowledgeLink,
  deleteKnowledgeLink, detectLinkType,
} from "@/services/linkService";
import { useAuth } from "@/context/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { isSupabaseConfigured } from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────

const LINK_TYPE_META: Record<LinkType, { label: string; Icon: typeof FileSpreadsheet; colorClass: string; bgClass: string }> = {
  google_sheet: {
    label: "Google Sheet",
    Icon: FileSpreadsheet,
    colorClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10 border-emerald-500/20",
  },
  google_doc: {
    label: "Google Doc",
    Icon: FileText,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
  word_doc: {
    label: "Word Document",
    Icon: FileType2,
    colorClass: "text-indigo-500",
    bgClass: "bg-indigo-500/10 border-indigo-500/20",
  },
  pdf: {
    label: "PDF",
    Icon: FileText,
    colorClass: "text-rose-500",
    bgClass: "bg-rose-500/10 border-rose-500/20",
  },
  other: {
    label: "Link",
    Icon: Globe,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500/10 border-amber-500/20",
  },
};

const DEFAULT_CATEGORIES = ["General", "Development", "Design", "HR", "Finance", "Product", "Marketing", "Operations"];

const AVATAR_COLORS = [
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-blue-500",
];

function avatarColor(id: string) {
  return AVATAR_COLORS[parseInt(id[0] ?? "0", 16) % AVATAR_COLORS.length];
}

// ── Mock data for offline mode ─────────────────────────────────────────────────
const MOCK_LINKS: KnowledgeLink[] = [
  {
    id: "1",
    title: "Sprint Planning Sheet",
    url: "https://docs.google.com/spreadsheets/d/example",
    description: "Weekly sprint planning and task tracking sheet for all teams.",
    type: "google_sheet",
    category: "Development",
    added_by_id: "1",
    added_by_name: "Alice Chen",
    added_by_avatar: "AC",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "2",
    title: "Product Requirements Document",
    url: "https://docs.google.com/document/d/example",
    description: "Master PRD for the Q2 product roadmap.",
    type: "google_doc",
    category: "Product",
    added_by_id: "2",
    added_by_name: "Bob Smith",
    added_by_avatar: "BS",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "3",
    title: "HR Onboarding Checklist",
    url: "https://sharepoint.example.com/onboarding.docx",
    description: "Step-by-step onboarding process for new team members.",
    type: "word_doc",
    category: "HR",
    added_by_id: "3",
    added_by_name: "Carol Johnson",
    added_by_avatar: "CJ",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "4",
    title: "Q2 Budget Overview",
    url: "https://docs.google.com/spreadsheets/d/budget",
    description: "Quarterly budget allocation and expense tracking.",
    type: "google_sheet",
    category: "Finance",
    added_by_id: "1",
    added_by_name: "Alice Chen",
    added_by_avatar: "AC",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

// ── Link Form Modal ───────────────────────────────────────────────────────────

interface LinkFormModalProps {
  existingLink?: KnowledgeLink;
  onSubmit: (payload: CreateLinkPayload) => Promise<void>;
  onClose: () => void;
}

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: "google_sheet", label: "Google Sheet" },
  { value: "google_doc", label: "Google Doc" },
  { value: "word_doc", label: "Word Document" },
  { value: "pdf", label: "PDF" },
  { value: "other", label: "Other" },
];

function LinkFormModal({ existingLink, onSubmit, onClose }: LinkFormModalProps) {
  const [title, setTitle] = useState(existingLink?.title ?? "");
  const [url, setUrl] = useState(existingLink?.url ?? "");
  const [description, setDescription] = useState(existingLink?.description ?? "");
  const [type, setType] = useState<LinkType>(existingLink?.type ?? "other");
  const [category, setCategory] = useState(existingLink?.category ?? "General");
  const [customCategory, setCustomCategory] = useState("");
  const [usingCustom, setUsingCustom] = useState(!DEFAULT_CATEGORIES.includes(existingLink?.category ?? "General"));
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState("");

  // Auto-detect type from URL
  function handleUrlChange(val: string) {
    setUrl(val);
    const detected = detectLinkType(val);
    setType(detected);
    setUrlError("");
  }

  function validateUrl(val: string) {
    try { new URL(val); return true; } catch { return false; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateUrl(url)) { setUrlError("Please enter a valid URL."); return; }
    const effectiveCategory = usingCustom ? customCategory.trim() || "General" : category;
    setSubmitting(true);
    await onSubmit({ title: title.trim(), url: url.trim(), description: description.trim() || null, type, category: effectiveCategory });
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card rounded-2xl border border-border shadow-2xl p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {existingLink ? "Edit Link" : "Add Knowledge Link"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Planning Sheet"
              className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              URL <span className="text-destructive">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
              className={`w-full rounded-lg border ${urlError ? "border-destructive" : "border-border"} bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition`}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>

          {/* Type + Category row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LinkType)}
                className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                {LINK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              {usingCustom ? (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Custom..."
                    className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  />
                  <button type="button" onClick={() => setUsingCustom(false)} className="px-2 rounded-lg border border-border hover:bg-muted/50 text-muted-foreground text-xs">
                    List
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setUsingCustom(true)} className="px-2 rounded-lg border border-border hover:bg-muted/50 text-muted-foreground text-xs">
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this document about?"
              rows={2}
              className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !url.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Saving…" : existingLink ? "Save Changes" : "Add Link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Link Card ─────────────────────────────────────────────────────────────────

interface LinkCardProps {
  link: KnowledgeLink;
  currentUserId: string | undefined;
  onEdit: (link: KnowledgeLink) => void;
  onDelete: (id: string) => void;
}

function LinkCard({ link, currentUserId, onEdit, onDelete }: LinkCardProps) {
  const [copied, setCopied] = useState(false);
  const meta = LINK_TYPE_META[link.type];
  const Icon = meta.Icon;

  function handleCopy() {
    navigator.clipboard.writeText(link.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(link.created_at).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) {
      const h = Math.floor(diff / 3600000);
      return h === 0 ? "Just now" : `${h}h ago`;
    }
    return days === 1 ? "Yesterday" : `${days}d ago`;
  }, [link.created_at]);

  return (
    <div className="group glass-card rounded-xl border border-border hover:border-primary/30 transition-all duration-200 p-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`shrink-0 h-10 w-10 rounded-xl border flex items-center justify-center ${meta.bgClass}`}>
          <Icon className={`h-5 w-5 ${meta.colorClass}`} />
        </div>
        {/* Title & type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground leading-snug truncate max-w-[200px]">
              {link.title}
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${meta.bgClass} ${meta.colorClass}`}>
              {meta.label}
            </span>
          </div>
          {link.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{link.description}</p>
          )}
        </div>
        {/* Actions (visible on hover) */}
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {currentUserId === link.added_by_id && (
            <button
              onClick={() => onEdit(link)}
              className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy URL"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {currentUserId === link.added_by_id && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this link?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{link.title}" will be permanently removed from the knowledge base.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(link.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Author + time */}
        <div className="flex items-center gap-2">
          <div
            className={`h-5 w-5 rounded-full bg-gradient-to-br ${avatarColor(link.added_by_id)} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}
          >
            {link.added_by_avatar}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {link.added_by_name} · {timeAgo}
          </span>
        </div>

        {/* Category tag + Open link */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/30 border border-border rounded-full px-2 py-0.5">
            <Tag className="h-2.5 w-2.5" />
            {link.category}
          </span>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function KnowledgeLinksView() {
  const { currentUser } = useAuth();

  const [links, setLinks] = useState<KnowledgeLink[]>(isSupabaseConfigured ? [] : MOCK_LINKS);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<KnowledgeLink | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<LinkType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [catDropOpen, setCatDropOpen] = useState(false);

  const loadLinks = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const data = await getKnowledgeLinks();
    setLinks(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  // Derived categories
  const allCategories = useMemo(() => {
    const cats = new Set(links.map((l) => l.category));
    return Array.from(cats).sort();
  }, [links]);

  // Filtered links
  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.added_by_name.toLowerCase().includes(q);
      const matchType = filterType === "all" || l.type === filterType;
      const matchCat = filterCategory === "all" || l.category === filterCategory;
      return matchSearch && matchType && matchCat;
    });
  }, [links, search, filterType, filterCategory]);

  // Stats
  const sheetCount = links.filter((l) => l.type === "google_sheet").length;
  const docCount = links.filter((l) => l.type === "google_doc" || l.type === "word_doc").length;

  // CRUD handlers
  async function handleCreate(payload: CreateLinkPayload) {
    if (!currentUser) return;
    const created = await createKnowledgeLink(
      payload, currentUser.id, currentUser.name, currentUser.avatar
    );
    if (created) setLinks((prev) => [created, ...prev]);
  }

  async function handleEdit(payload: CreateLinkPayload) {
    if (!editingLink) return;
    const ok = await updateKnowledgeLink(editingLink.id, payload);
    if (ok) {
      setLinks((prev) =>
        prev.map((l) =>
          l.id === editingLink.id
            ? { ...l, ...payload, description: payload.description ?? null }
            : l
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteKnowledgeLink(id);
    if (ok) setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function openEditForm(link: KnowledgeLink) {
    setEditingLink(link);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingLink(undefined);
  }

  const activeFilterCount = (filterType !== "all" ? 1 : 0) + (filterCategory !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Shared documents, sheets, and resources for the team
          </p>
        </div>
        <button
          onClick={() => { setEditingLink(undefined); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          Add Link
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Links", value: links.length, icon: Link2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Spreadsheets", value: sheetCount, icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Documents", value: docCount, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Categories", value: allCategories.length, icon: Layers, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl border border-border p-3.5 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-tight">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links…"
            className="w-full rounded-lg border border-border bg-background/50 pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="relative">
          <button
            onClick={() => { setTypeDropOpen((v) => !v); setCatDropOpen(false); }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${filterType !== "all" ? "border-primary/50 bg-primary/8 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {filterType === "all" ? "All Types" : LINK_TYPE_META[filterType].label}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${typeDropOpen ? "rotate-180" : ""}`} />
          </button>
          {typeDropOpen && (
            <div className="absolute top-full mt-1 left-0 w-44 glass-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
              {[{ value: "all", label: "All Types" }, ...LINK_TYPES].map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setFilterType(t.value as LinkType | "all"); setTypeDropOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${filterType === t.value ? "bg-primary/8 text-primary font-medium" : "text-foreground hover:bg-muted/50"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category filter */}
        {allCategories.length > 0 && (
          <div className="relative">
            <button
              onClick={() => { setCatDropOpen((v) => !v); setTypeDropOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${filterCategory !== "all" ? "border-primary/50 bg-primary/8 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <Tag className="h-3.5 w-3.5" />
              {filterCategory === "all" ? "All Categories" : filterCategory}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catDropOpen ? "rotate-180" : ""}`} />
            </button>
            {catDropOpen && (
              <div className="absolute top-full mt-1 left-0 w-48 glass-card rounded-xl border border-border shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                {[{ value: "all", label: "All Categories" }, ...allCategories.map((c) => ({ value: c, label: c }))].map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setFilterCategory(c.value); setCatDropOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${filterCategory === c.value ? "bg-primary/8 text-primary font-medium" : "text-foreground hover:bg-muted/50"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setFilterType("all"); setFilterCategory("all"); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-all"
          >
            <X className="h-3.5 w-3.5" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ── Links grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading knowledge base…</p>
          </div>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted/30 border border-border flex items-center justify-center">
            <BookOpen className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              {search || activeFilterCount > 0 ? "No links match your filters" : "No knowledge links yet"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {search || activeFilterCount > 0 ? "Try adjusting your search or filters" : "Add the first document link to get started!"}
            </p>
          </div>
          {!(search || activeFilterCount > 0) && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 mt-1 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add first link
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground -mt-2">
            {filteredLinks.length} {filteredLinks.length === 1 ? "link" : "links"} found
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                currentUserId={currentUser?.id}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <LinkFormModal
          existingLink={editingLink}
          onSubmit={editingLink ? handleEdit : handleCreate}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
