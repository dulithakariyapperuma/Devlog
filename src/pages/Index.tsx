import { useState, useMemo, useEffect, useCallback } from "react";
import DevLogSidebar from "@/components/DevLogSidebar";
import SearchBar from "@/components/SearchBar";
import Timeline from "@/components/Timeline";
import EntryFormModal from "@/components/EntryFormModal";
import ProjectsView from "@/components/ProjectsView";
import MySolutionsView from "@/components/MySolutionsView";
import SearchView from "@/components/SearchView";
import TeamView from "@/components/TeamView";
import FloatingChatManager from "@/components/FloatingChatManager";
import QAView from "@/components/QAView";
import {
  initialProjects,
  initialBugReports,
  type SolutionEntry,
  type Project,
  type BugReport,
} from "@/data/mockData";
import { ArrowLeft, CheckCircle2, Zap, ChevronDown, Trash2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  createEntry,
  updateEntry,
  deleteEntry,
} from "@/services/projectService";
import { getBugReports } from "@/services/bugService";
import { subscribeToProjectEntries } from "@/services/chatService";

type NavItem = "feed" | "projects" | "solutions" | "search" | "team" | "qa";

const Index = () => {
  const { currentUser, allMembers } = useAuth();
  const { openGroupChat } = useChat();

  const [activeNav, setActiveNav] = useState<NavItem>("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>(
    isSupabaseConfigured ? [] : initialProjects
  );
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [feedProjectId, setFeedProjectId] = useState<string>(
    isSupabaseConfigured ? "" : (initialProjects[0]?.id ?? "")
  );
  const [feedDropdownOpen, setFeedDropdownOpen] = useState(false);
  const [bugReports, setBugReports] = useState<BugReport[]>(
    isSupabaseConfigured ? [] : initialBugReports
  );
  const [dataLoading, setDataLoading] = useState(isSupabaseConfigured);

  const openBugCount = bugReports.filter((b) => b.status === "open").length;
  const onlineCount = allMembers.filter((m) => m.status === "online").length;

  // ── Build a members lookup map ───────────────────────────────────────────────
  const membersMap = useMemo(
    () => new Map(allMembers.map((m) => [m.id, m])),
    [allMembers]
  );

  // ── Initial data load from Supabase ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUser) return;
    setDataLoading(true);
    const [fetchedProjects, fetchedBugs] = await Promise.all([
      getProjects(membersMap),
      getBugReports(),
    ]);
    setProjects(fetchedProjects);
    setBugReports(fetchedBugs);
    if (fetchedProjects.length > 0 && !feedProjectId) {
      setFeedProjectId(fetchedProjects[0].id);
    }
    setDataLoading(false);
  }, [currentUser, membersMap, feedProjectId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── Real-time subscription: refresh entries when any project changes ─────────
  useEffect(() => {
    if (!isSupabaseConfigured || projects.length === 0) return;
    const unsubs = projects.map((p) =>
      subscribeToProjectEntries(p.id, async () => {
        const refreshed = await getProjects(membersMap);
        setProjects(refreshed);
      })
    );
    return () => unsubs.forEach((fn) => fn());
  }, [projects.length, membersMap]); // re-subscribe when project list changes

  // ── Project CRUD ─────────────────────────────────────────────────────────────
  const handleAddProject = async (project: Project) => {
    if (!isSupabaseConfigured) {
      setProjects((prev) => [project, ...prev]);
      return;
    }
    const created = await createProject(
      {
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      project.memberIds
    );
    if (created) {
      setProjects((prev) => [created, ...prev]);
      if (!feedProjectId) setFeedProjectId(created.id);
    }
  };

  const handleEditProject = async (updated: Project) => {
    // Optimistic UI update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? { ...updated, entries: p.entries, groupMessages: p.groupMessages }
          : p
      )
    );
    if (activeProject?.id === updated.id) {
      setActiveProject((prev) =>
        prev ? { ...updated, entries: prev.entries, groupMessages: prev.groupMessages } : prev
      );
    }
    if (!isSupabaseConfigured) return;
    await updateProject(
      updated.id,
      {
        name: updated.name,
        description: updated.description,
        status: updated.status,
        startDate: updated.startDate,
        endDate: updated.endDate,
      },
      updated.memberIds
    );
  };

  const handleDeleteProject = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProject?.id === id) setActiveProject(null);
    if (feedProjectId === id) {
      setFeedProjectId(projects.find((p) => p.id !== id)?.id ?? "");
    }
    if (!isSupabaseConfigured) return;
    await deleteProject(id);
  };

  // ── Entry CRUD ───────────────────────────────────────────────────────────────
  const updateEntriesLocally = (
    projectId: string,
    updater: (e: SolutionEntry[]) => SolutionEntry[]
  ) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, entries: updater(p.entries) } : p))
    );
    if (activeProject?.id === projectId) {
      setActiveProject((prev) =>
        prev ? { ...prev, entries: updater(prev.entries) } : prev
      );
    }
  };

  const newEntry = async (entry: SolutionEntry) => {
    const pid = activeProject?.id ?? feedProjectId;
    const withCurrentUser = { ...entry, author: currentUser ?? entry.author };
    // Optimistic
    updateEntriesLocally(pid, (es) => [withCurrentUser, ...es]);
    if (!isSupabaseConfigured || !currentUser) return;
    await createEntry(pid, currentUser.id, {
      status: entry.status,
      title: entry.title,
      module: entry.module,
      errorMessage: entry.errorMessage,
      explanation: entry.explanation,
      codeSnippet: entry.codeSnippet,
    });
    // Real-time subscription will refresh, but also reload to get the DB-generated id
    const refreshed = await getProjects(membersMap);
    setProjects(refreshed);
  };

  const editEntry = async (updated: SolutionEntry) => {
    const pid = activeProject?.id ?? feedProjectId;
    updateEntriesLocally(pid, (es) => es.map((e) => (e.id === updated.id ? updated : e)));
    if (!isSupabaseConfigured) return;
    await updateEntry(updated.id, {
      status: updated.status,
      title: updated.title,
      module: updated.module,
      errorMessage: updated.errorMessage,
      explanation: updated.explanation,
      codeSnippet: updated.codeSnippet,
    });
  };

  const deleteEntryItem = async (id: string) => {
    const pid = activeProject?.id ?? feedProjectId;
    updateEntriesLocally(pid, (es) => es.filter((e) => e.id !== id));
    if (!isSupabaseConfigured) return;
    await deleteEntry(id);
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleViewProject = (project: Project) => {
    setActiveProject(project);
    setActiveNav("projects");
    setSearchQuery("");
  };
  const handleBack = () => setActiveProject(null);
  const handleNavigate = (item: NavItem) => {
    setActiveNav(item);
    if (item !== "projects") setActiveProject(null);
    setSearchQuery("");
  };

  const feedProject = useMemo(
    () => projects.find((p) => p.id === feedProjectId) ?? projects[0] ?? null,
    [projects, feedProjectId]
  );
  const displayedProject = activeProject ?? (activeNav === "feed" ? feedProject : null);
  const displayedEntries = useMemo(() => {
    const entries = displayedProject?.entries ?? [];
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q) ||
        e.explanation.toLowerCase().includes(q) ||
        e.errorMessage?.toLowerCase().includes(q) ||
        e.author.name.toLowerCase().includes(q)
    );
  }, [searchQuery, displayedProject]);

  // ── Feed header ──────────────────────────────────────────────────────────────
  const renderFeedHeader = () => {
    const proj = displayedProject;
    return (
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        <div className="flex items-center gap-4">
          {activeProject && activeNav === "projects" && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Projects
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {activeNav === "feed" ? (
                <div className="relative">
                  <button
                    onClick={() => setFeedDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 text-2xl font-bold text-foreground hover:text-primary transition-colors"
                  >
                    {proj?.name ?? "Live Feed"}
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${feedDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {feedDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 glass-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
                      {projects.map((p) => (
                        <div key={p.id} className="flex items-center group/item">
                          <button
                            onClick={() => { setFeedProjectId(p.id); setFeedDropdownOpen(false); }}
                            className={`flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors ${p.id === feedProjectId ? "bg-primary/8 text-primary" : "text-foreground"}`}
                          >
                            <span className={`h-2 w-2 rounded-full shrink-0 ${p.status === "active" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                            <span className="text-sm font-medium truncate">{p.name}</span>
                            {p.id === feedProjectId && <span className="ml-auto text-[10px] text-primary font-semibold">Selected</span>}
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-3 opacity-0 group-hover/item:opacity-100 hover:text-destructive text-muted-foreground transition-all"
                                title="Delete project"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove "{p.name}" and all its entries.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { handleDeleteProject(p.id); setFeedDropdownOpen(false); }}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-foreground">{proj?.name ?? "Feed"}</h1>
              )}
              {proj && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${proj.status === "completed" ? "status-resolved" : "status-in-progress"}`}>
                  {proj.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                  {proj.status === "completed" ? "Completed" : "Active"}
                </span>
              )}
            </div>
            {proj && (
              <p className="text-sm text-muted-foreground mt-1">
                {format(proj.startDate, "dd MMM yyyy")} → {proj.endDate ? format(proj.endDate, "dd MMM yyyy") : "Ongoing"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {proj && (
            <button
              onClick={() => openGroupChat(proj)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors border border-border hover:border-primary/40 rounded-lg px-3 py-2"
              title="Open project group chat"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </button>
          )}
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <EntryFormModal onSubmit={newEntry} showTrigger />
        </div>
      </div>
    );
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <DevLogSidebar active={activeNav} onNavigate={handleNavigate} onlineCount={0} openBugCount={0} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading workspace…</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Main content ──────────────────────────────────────────────────────────────
  const renderMain = () => {
    if (activeNav === "feed" || (activeNav === "projects" && activeProject)) {
      return (
        <main
          className="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto pt-[4.5rem] md:pt-8 pb-24 md:pb-8"
          onClick={() => setFeedDropdownOpen(false)}
        >
          {renderFeedHeader()}
          {displayedEntries.length > 0 ? (
            <Timeline entries={displayedEntries} onEdit={editEntry} onDelete={deleteEntryItem} />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              {searchQuery ? "No entries match your search." : "No entries yet — add the first one!"}
            </div>
          )}
        </main>
      );
    }
    if (activeNav === "projects") return (
      <main className="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto pt-[4.5rem] md:pt-8 pb-24 md:pb-8">
        <ProjectsView
          projects={projects}
          onView={handleViewProject}
          onAdd={handleAddProject}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
        />
      </main>
    );
    if (activeNav === "solutions") return (
      <main className="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto pt-[4.5rem] md:pt-8 pb-24 md:pb-8">
        <MySolutionsView projects={projects} />
      </main>
    );
    if (activeNav === "search") return (
      <main className="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto pt-[4.5rem] md:pt-8 pb-24 md:pb-8">
        <SearchView projects={projects} onViewProject={handleViewProject} />
      </main>
    );
    if (activeNav === "team") return (
      <main className="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto pt-[4.5rem] md:pt-8 pb-24 md:pb-8">
        <TeamView projects={projects} onViewProject={handleViewProject} />
      </main>
    );
    if (activeNav === "qa") return (
      <main className="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto pt-[4.5rem] md:pt-8 pb-24 md:pb-8">
        <QAView projects={projects} />
      </main>
    );
    return <main className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Coming soon.</main>;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <DevLogSidebar
        active={activeNav}
        onNavigate={handleNavigate}
        onlineCount={onlineCount}
        openBugCount={openBugCount}
      />
      {renderMain()}
      <FloatingChatManager projects={projects} />
    </div>
  );
};

export default Index;
