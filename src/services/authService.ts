/**
 * authService.ts
 * Wraps Supabase Auth + profile management.
 */
import { supabase } from "@/lib/supabase";
import type { TeamMember } from "@/data/mockData";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map a Supabase profile row → app TeamMember shape */
function rowToMember(row: {
    id: string;
    name: string;
    avatar: string;
    status: string;
    role: string;
    email: string;
}): TeamMember {
    return {
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        status: row.status as TeamMember["status"],
        role: row.role,
        email: row.email,
        password: "", // never returned from backend
    };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(
    email: string,
    password: string
): Promise<{ user: TeamMember | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { user: null, error: error?.message ?? "Login failed" };

    // Fetch profile
    const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

    if (profileErr || !profile) return { user: null, error: "Profile not found" };

    // Mark online
    await supabase.from("profiles").update({ status: "online" }).eq("id", data.user.id);

    return { user: rowToMember({ ...profile, status: "online" }), error: null };
}

export async function signOut(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from("profiles").update({ status: "offline" }).eq("id", user.id);
    }
    await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<TeamMember | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return profile ? rowToMember(profile) : null;
}

// ── Profiles / Team ───────────────────────────────────────────────────────────

export async function getAllMembers(): Promise<TeamMember[]> {
    const { data, error } = await supabase.from("profiles").select("*").order("name");
    if (error || !data) return [];
    return data.map(rowToMember);
}

export async function updateProfile(
    userId: string,
    patch: Partial<Pick<TeamMember, "name" | "role" | "status">>
): Promise<void> {
    await supabase.from("profiles").update(patch).eq("id", userId);
}
