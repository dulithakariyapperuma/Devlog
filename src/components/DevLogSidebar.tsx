import { useAuth } from "@/context/AuthContext";
import { Rss, FileCode2, Search, Users, Terminal, FolderKanban, LogOut, Bug } from "lucide-react";

type NavItem = "feed" | "projects" | "solutions" | "search" | "team" | "qa";

interface Props {
  active: NavItem;
  onNavigate: (item: NavItem) => void;
  onlineCount: number;
  openBugCount?: number;
}

const navItems: { id: NavItem; label: string; icon: typeof Rss }[] = [
  { id: "feed", label: "Live Feed", icon: Rss },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "solutions", label: "Solutions", icon: FileCode2 },
  { id: "search", label: "Search", icon: Search },
  { id: "team", label: "Team", icon: Users },
  { id: "qa", label: "QA Bugs", icon: Bug },
];

const AVATAR_COLORS = [
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-blue-500",
];

export default function DevLogSidebar({ active, onNavigate, onlineCount, openBugCount = 0 }: Props) {
  const { currentUser, logout } = useAuth();
  const avatarColor = AVATAR_COLORS[parseInt(currentUser?.id ?? "0") % AVATAR_COLORS.length];

  return (
    <>
      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="glass-sidebar w-60 shrink-0 hidden md:flex flex-col p-6 h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Terminal className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">DevLog</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
              >
                {item.id === "qa" && openBugCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {openBugCount > 9 ? "9+" : openBugCount}
                  </span>
                )}
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live team status */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-resolved opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-resolved" />
            </span>
            <span>{onlineCount} online</span>
          </div>

          {/* User profile */}
          {currentUser && (
            <div className="flex items-center gap-2.5 group">
              <div
                className={`h-8 w-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
              >
                {currentUser.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight truncate">{currentUser.name}</p>
                <p className="text-[10px] text-muted-foreground/70 truncate">{currentUser.role}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all"
              >
                <LogOut className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile Top Bar (visible only on mobile) ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 glass-sidebar border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Terminal className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-foreground">DevLog</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-resolved opacity-75 animate-pulse" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-resolved" />
            </span>
            {onlineCount}
          </span>
          {currentUser && (
            <div className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-[9px] font-bold text-white`}
              >
                {currentUser.avatar}
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-all"
              >
                <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile Bottom Nav Bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-sidebar border-t border-border/50 flex items-center justify-around px-2 py-2 safe-bottom">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0 flex-1 ${isActive
                ? "text-primary"
                : "text-muted-foreground"
                }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className={`text-[10px] font-semibold truncate ${isActive ? "text-primary" : ""}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="h-0.5 w-4 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
