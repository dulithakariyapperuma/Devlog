import { Link, Outlet, useLocation } from "react-router-dom";
import { 
    LayoutDashboard, 
    Users, 
    FolderKanban, 
    Bug, 
    BookOpen,
    LogOut,
    Menu
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNavigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Projects", href: "/admin/projects", icon: FolderKanban },
    { name: "Bug Reports", href: "/admin/bugs", icon: Bug },
    { name: "Content Mods", href: "/admin/content", icon: BookOpen },
];

export function AdminLayout() {
    const { pathname } = useLocation();
    const { signOut, currentUser } = useAuth();

    return (
        <div className="min-h-screen bg-muted/40 md:flex">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-card border-r border-border md:min-h-screen flex flex-col">
                <div className="p-4 md:p-6 border-b border-border flex items-center justify-between md:justify-start gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">A</span>
                        </div>
                        <h1 className="font-semibold text-lg hidden md:block">Admin Panel</h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {adminNavigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                    isActive 
                                        ? "bg-primary text-primary-foreground" 
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border mt-auto">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center overflow-hidden">
                                {currentUser?.avatar ? (
                                    <img src={currentUser.avatar} alt="Admin" className="w-full h-full object-cover" />
                                ) : (
                                    <Users className="w-4 h-4" />
                                )}
                            </div>
                            <div className="hidden md:block overflow-hidden">
                                <p className="text-sm font-medium truncate">{currentUser?.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                            </div>
                        </div>
                        
                        <Button 
                            variant="outline" 
                            className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10"
                            onClick={signOut}
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden md:inline">Sign Out</span>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content Areas */}
            <main className="flex-1 flex flex-col">
                <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
