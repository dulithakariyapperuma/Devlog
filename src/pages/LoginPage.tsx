import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Terminal, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
    { name: "Dulitha Kariyapperuma", email: "dulitha@devlog.io", role: "Intern" },
    { name: "Iman Salam", email: "iman@devlog.io", role: "Associate Engineer" },
    { name: "Ravindu", email: "ravindu@devlog.io", role: "Associate Engineer" },
    { name: "Saviru", email: "saviru@devlog.io", role: "Associate Engineer" },
    { name: "Vidam", email: "vidam@devlog.io", role: "Associate Engineer" },
];

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const { success, error: loginError } = await login(email.trim(), password);
        if (!success) setError(loginError ?? "Invalid email or password.");
        setLoading(false);
    };

    const fillDemo = (e: string) => {
        setEmail(e);
        setPassword("pass123");
        setError("");
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-primary/90 via-primary to-indigo-700 p-12">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                        <Terminal className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white">DevLog</span>
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                        Track every fix.<br />Share every win.
                    </h1>
                    <p className="text-white/70 text-lg leading-relaxed mb-10">
                        A living feed of your team's technical solutions — errors solved, issues logged, knowledge shared in real time.
                    </p>
                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2">
                        {["Multi-project", "Team collaboration", "Code snippets", "Live feed", "Sprint tracking"].map((f) => (
                            <span key={f} className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium border border-white/15">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>
                {/* Team avatars */}
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {DEMO_ACCOUNTS.map((a, i) => (
                            <div
                                key={a.email}
                                className={`h-9 w-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i]} flex items-center justify-center text-[10px] font-bold text-white border-2 border-white/20`}
                                title={a.name}
                            >
                                {a.email.slice(0, 2).toUpperCase()}
                            </div>
                        ))}
                    </div>
                    <span className="text-white/60 text-sm">5 engineers on the team</span>
                </div>
            </div>

            {/* Right panel — login form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <Terminal className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold text-foreground">DevLog</span>
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
                    <p className="text-sm text-muted-foreground mb-8">Sign in to your team's workspace</p>

                    {/* Demo accounts quick-select */}
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Quick sign-in
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {DEMO_ACCOUNTS.map((a, i) => (
                                <button
                                    key={a.email}
                                    onClick={() => fillDemo(a.email)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground hover:text-foreground`}
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i]} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}
                                    >
                                        {a.email.slice(0, 2).toUpperCase()}
                                    </span>
                                    {a.name.split(" ")[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@devlog.io"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    autoComplete="current-password"
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                <p className="text-xs text-destructive">{error}</p>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Signing in…
                                </span>
                            ) : "Sign in"}
                        </Button>
                    </form>

                    <p className="text-center text-xs text-muted-foreground mt-8">
                        All accounts use password:{" "}
                        <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">pass123</code>
                    </p>
                </div>
            </div>
        </div>
    );
}
