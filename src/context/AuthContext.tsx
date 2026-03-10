import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { teamMembers as initialMembers, type TeamMember } from "@/data/mockData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { signIn, signUp as signUpService, signOut, getCurrentUser, getAllMembers, updateProfile } from "@/services/authService";

interface AuthContextValue {
    currentUser: TeamMember | null;
    allMembers: TeamMember[];
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
    register: (email: string, password: string, name: string) => Promise<{ success: boolean; error: string | null }>;
    logout: () => Promise<void>;
    updateCurrentUser: (patch: Partial<Pick<TeamMember, "name" | "role" | "status">>) => Promise<void>;
    refreshMembers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
    const [allMembers, setAllMembers] = useState<TeamMember[]>(
        isSupabaseConfigured ? [] : initialMembers
    );
    const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

    // ── Bootstrap ────────────────────────────────────────────────
    useEffect(() => {
        if (!isSupabaseConfigured) return;

        let mounted = true;

        async function init() {
            const user = await getCurrentUser();
            const members = await getAllMembers();
            if (mounted) {
                setCurrentUser(user);
                setAllMembers(members);
                setIsLoading(false);
            }
        }

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === "SIGNED_OUT") {
                if (mounted) setCurrentUser(null);
            } else if (event === "SIGNED_IN") {
                const user = await getCurrentUser();
                const members = await getAllMembers();
                if (mounted) {
                    setCurrentUser(user);
                    setAllMembers(members);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const refreshMembers = useCallback(async () => {
        if (!isSupabaseConfigured) return;
        const members = await getAllMembers();
        setAllMembers(members);
    }, []);

    // ── Login ─────────────────────────────────────────────────────
    const login = useCallback(async (email: string, password: string) => {
        if (!isSupabaseConfigured) {
            const user = initialMembers.find(
                (m) => m.email.toLowerCase() === email.toLowerCase() && m.password === password
            );
            if (user) {
                const loggedIn = { ...user, status: "online" as const };
                setCurrentUser(loggedIn);
                setAllMembers((prev) => prev.map((m) => (m.id === user.id ? loggedIn : m)));
                return { success: true, error: null };
            }
            return { success: false, error: "Invalid email or password." };
        }

        const { user, error } = await signIn(email, password);
        if (user) {
            setCurrentUser(user);
            const members = await getAllMembers();
            setAllMembers(members);
            return { success: true, error: null };
        }
        return { success: false, error };
    }, []);

    // ── Register ──────────────────────────────────────────────────
    const register = useCallback(async (email: string, password: string, name: string) => {
        if (!isSupabaseConfigured) {
            return { success: false, error: "Registration requires Supabase to be configured." };
        }

        const { user, error } = await signUpService(email, password, name);
        if (user) {
            setCurrentUser(user);
            const members = await getAllMembers();
            setAllMembers(members);
            return { success: true, error: null };
        }
        return { success: false, error };
    }, []);

    // ── Logout ────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        if (!isSupabaseConfigured) {
            if (currentUser) {
                setAllMembers((prev) =>
                    prev.map((m) => (m.id === currentUser.id ? { ...m, status: "offline" as const } : m))
                );
            }
            setCurrentUser(null);
            return;
        }
        await signOut();
        setCurrentUser(null);
    }, [currentUser]);

    // ── Update profile ────────────────────────────────────────────
    const updateCurrentUser = useCallback(
        async (patch: Partial<Pick<TeamMember, "name" | "role" | "status">>) => {
            if (!currentUser) return;
            if (isSupabaseConfigured) {
                await updateProfile(currentUser.id, patch);
            }
            const updated = { ...currentUser, ...patch };
            setCurrentUser(updated);
            setAllMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        },
        [currentUser]
    );

    return (
        <AuthContext.Provider
            value={{ currentUser, allMembers, isLoading, login, register, logout, updateCurrentUser, refreshMembers }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
