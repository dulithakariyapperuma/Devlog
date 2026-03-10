/**
 * authService.ts
 * Wraps Supabase Auth + profile management.
 */
import { supabase } from "@/lib/supabase";
import type { TeamMember } from "@/data/mockData";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileRow {
    id: string;
    name: string;
    avatar: string;
    status: string;
    role: string;
    email: string;
    is_admin: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToMember(row: ProfileRow): TeamMember {
    return {
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        status: row.status as TeamMember["status"],
        role: row.role,
        email: row.email,
        password: "",
        isAdmin: row.is_admin ?? false,
    };
}

// Fetch a profile row — uses `as any` to bypass Supabase strict never typing on generated client
async function getProfile(userId: string): Promise<ProfileRow | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("profiles").select("*").eq("id", userId).single();
    if (error || !data) return null;
    return data as ProfileRow;
}

// ── Auth ─────────────────────────────────────────────────────────────────────


export async function signIn(
    email: string,
    password: string
): Promise<{ user: TeamMember | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { user: null, error: error?.message ?? "Login failed" };

    const profile = await getProfile(data.user.id);
    if (!profile) return { user: null, error: "Profile not found. Please contact your admin." };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("profiles").update({ status: "online" }).eq("id", data.user.id);

    return { user: rowToMember({ ...profile, status: "online" }), error: null };
}

export async function signUp(
    email: string,
    password: string,
    name: string
): Promise<{ user: TeamMember | null; error: string | null }> {
    const avatar =
        name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) ||
        email.slice(0, 2).toUpperCase();

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, avatar, role: "Member" } },
    });

    if (error || !data.user) return { user: null, error: error?.message ?? "Sign up failed" };

    if (!data.session) {
        return {
            user: null,
            error: "Please disable 'Confirm email' in Supabase Authentication -> Providers -> Email, or click the verification link sent to your email."
        };
    }

    // Wait for the trigger to create the profile row
    await new Promise((r) => setTimeout(r, 800));

    const profile = await getProfile(data.user.id);

    if (!profile) {
        // Trigger might still be running — return a minimal member
        return {
            user: {
                id: data.user.id,
                name,
                avatar,
                status: "online",
                role: "Member",
                email,
                password: "",
                isAdmin: false,
            },
            error: null,
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("profiles").update({ status: "online" }).eq("id", data.user.id);
    return { user: rowToMember({ ...profile, status: "online" }), error: null };
}

export async function signOut(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("profiles").update({ status: "offline" }).eq("id", user.id);
    }
    await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<TeamMember | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await getProfile(user.id);
    return profile ? rowToMember(profile) : null;
}

// ── Profiles / Team ───────────────────────────────────────────────────────────

export async function getAllMembers(): Promise<TeamMember[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("profiles").select("*").order("name");
    if (error || !data) return [];
    return (data as ProfileRow[]).map(rowToMember);
}

export async function updateProfile(
    userId: string,
    patch: Partial<Pick<TeamMember, "name" | "role" | "status">>
): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("profiles").update(patch).eq("id", userId);
}
