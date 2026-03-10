import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Terminal, Eye, EyeOff, AlertCircle, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AVATAR_COLORS = [
    "from-violet-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
];

export default function LoginPage() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<"login" | "signup">("login");

    // Shared fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Signup-only
    const [name, setName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const reset = () => {
        setEmail(""); setPassword(""); setName(""); setConfirmPassword(""); setError("");
    };

    const switchMode = (m: "login" | "signup") => { setMode(m); reset(); };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setLoading(true);
        const { success, error: loginError } = await login(email.trim(), password);
        if (!success) setError(loginError ?? "Invalid email or password.");
        setLoading(false);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) return setError("Please enter your full name.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (password !== confirmPassword) return setError("Passwords do not match.");
        setLoading(true);
        const { success, error: regError } = await register(email.trim(), password, name.trim());
        if (!success) setError(regError ?? "Sign up failed. Please try again.");
        setLoading(false);
    };

    const isLogin = mode === "login";
    // Preview initials from name for signup avatar
    const previewInitials = name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

    return (
        <div className="min-h-screen flex">
            {/* ── Left panel — branding ────────────────────────────── */}
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
                    <p className="text-white/70 text-lg leading-relaxed">
                        A living feed of your team's solutions, bugs, and breakthroughs — all in one place.
                    </p>
                </div>
                {/* Feature chips */}
                <div className="flex flex-wrap gap-2">
                    {["Real-time feed", "Project tracking", "QA Bug tracker", "Team chat"].map((f) => (
                        <span key={f} className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                            {f}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Right panel — form ───────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <Terminal className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold text-foreground">DevLog</span>
                    </div>

                    {/* Mode toggle tabs */}
                    <div className="flex rounded-xl bg-muted/60 p-1 mb-8 gap-1">
                        <button
                            onClick={() => switchMode("login")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <LogIn className="h-3.5 w-3.5" /> Sign In
                        </button>
                        <button
                            onClick={() => switchMode("signup")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <UserPlus className="h-3.5 w-3.5" /> Create Account
                        </button>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-foreground">
                            {isLogin ? "Welcome back" : "Join DevLog"}
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            {isLogin
                                ? "Sign in to your workspace"
                                : "Create your account to get started"}
                        </p>
                    </div>

                    {/* Signup avatar preview */}
                    {!isLogin && (
                        <div className="flex justify-center mb-6">
                            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[0]} flex items-center justify-center text-xl font-bold text-white shadow-lg transition-all`}>
                                {previewInitials}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-5">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* ── Login Form ── */}
                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
                                {loading ? (
                                    <><span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Signing in…</>
                                ) : (
                                    <><LogIn className="h-4 w-4" />Sign In</>
                                )}
                            </Button>
                        </form>
                    ) : (
                        /* ── Signup Form ── */
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Dulitha Kariyapperuma"
                                    required
                                    autoComplete="name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password <span className="text-muted-foreground font-normal text-xs">(min 6 chars)</span></Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm Password</Label>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                            <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
                                {loading ? (
                                    <><span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Creating account…</>
                                ) : (
                                    <><UserPlus className="h-4 w-4" />Create Account</>
                                )}
                            </Button>
                            <p className="text-[11px] text-muted-foreground text-center">
                                Your account will be active immediately after sign-up.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
