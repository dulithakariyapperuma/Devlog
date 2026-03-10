/**
 * projectService.ts
 * CRUD operations for Projects and their memberships.
 */
import { supabase } from "@/lib/supabase";
import type { Project, SolutionEntry, TeamMember } from "@/data/mockData";

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToEntry(
    row: {
        id: string;
        project_id: string;
        author_id: string;
        status: string;
        title: string;
        module: string;
        error_message: string | null;
        explanation: string;
        code_snippet: string | null;
        created_at: string;
    },
    author: TeamMember
): SolutionEntry {
    return {
        id: row.id,
        author,
        status: row.status as SolutionEntry["status"],
        title: row.title,
        module: row.module,
        errorMessage: row.error_message ?? undefined,
        explanation: row.explanation,
        codeSnippet: row.code_snippet ?? undefined,
        timestamp: new Date(row.created_at),
    };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(membersMap: Map<string, TeamMember>): Promise<Project[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data: rows, error } = await client
        .from("projects")
        .select(`
      *,
      project_members ( member_id ),
      solution_entries (
        id, project_id, author_id, status, title, module,
        error_message, explanation, code_snippet, created_at
      )
    `)
        .order("created_at", { ascending: false });

    if (error || !rows) return [];

    return rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status as Project["status"],
        startDate: new Date(p.start_date),
        endDate: p.end_date ? new Date(p.end_date) : undefined,
        memberIds: (p.project_members as { member_id: string }[]).map((pm) => pm.member_id),
        entries: (p.solution_entries as Parameters<typeof rowToEntry>[0][]).map((e) =>
            rowToEntry(e, membersMap.get(e.author_id) ?? fallbackMember(e.author_id))
        ),
        groupMessages: [], // loaded separately per project when chat is opened
    }));
}

export async function createProject(
    data: { name: string; description: string; status: Project["status"]; startDate: Date; endDate?: Date },
    memberIds: string[]
): Promise<Project | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data: row, error } = await client
        .from("projects")
        .insert({
            name: data.name,
            description: data.description,
            status: data.status,
            start_date: data.startDate.toISOString().split("T")[0],
            end_date: data.endDate ? data.endDate.toISOString().split("T")[0] : null,
        })
        .select()
        .single();

    if (error || !row) {
        console.error("Create Project Error:", error);
        window.alert(`Failed to create project: ${error?.message || "Unknown error"}`);
        return null;
    }

    // Add members
    if (memberIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("project_members").insert(
            memberIds.map((mid) => ({ project_id: row.id, member_id: mid }))
        );
    }

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status as Project["status"],
        startDate: new Date(row.start_date),
        endDate: row.end_date ? new Date(row.end_date) : undefined,
        memberIds,
        entries: [],
        groupMessages: [],
    };
}

export async function updateProject(
    id: string,
    data: Partial<{ name: string; description: string; status: Project["status"]; startDate: Date; endDate?: Date }>,
    memberIds?: string[]
): Promise<void> {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.status !== undefined) patch.status = data.status;
    if (data.startDate !== undefined) patch.start_date = data.startDate.toISOString().split("T")[0];
    if (data.endDate !== undefined) patch.end_date = data.endDate.toISOString().split("T")[0];
    else if (data.endDate === undefined && "endDate" in data) patch.end_date = null;

    if (Object.keys(patch).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("projects").update(patch).eq("id", id);
    }

    // Replace members if provided
    if (memberIds !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("project_members").delete().eq("project_id", id);
        if (memberIds.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from("project_members").insert(
                memberIds.map((mid) => ({ project_id: id, member_id: mid }))
            );
        }
    }
}

export async function deleteProject(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("projects").delete().eq("id", id);
}

// ── Solution Entries ──────────────────────────────────────────────────────────

export async function createEntry(
    projectId: string,
    authorId: string,
    data: Omit<SolutionEntry, "id" | "author" | "timestamp">
): Promise<SolutionEntry | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data: row, error } = await client
        .from("solution_entries")
        .insert({
            project_id: projectId,
            author_id: authorId,
            status: data.status,
            title: data.title,
            module: data.module,
            error_message: data.errorMessage ?? null,
            explanation: data.explanation,
            code_snippet: data.codeSnippet ?? null,
        })
        .select()
        .single();

    if (error || !row) {
        console.error("Create Entry Error:", error);
        window.alert(`Failed to create entry: ${error?.message || "Unknown error"}`);
        return null;
    }
    // author filled in by caller
    return null; // re-fetch handled by caller
}

export async function updateEntry(
    id: string,
    data: Partial<Omit<SolutionEntry, "id" | "author" | "timestamp">>
): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("solution_entries").update({
        status: data.status,
        title: data.title,
        module: data.module,
        error_message: data.errorMessage ?? null,
        explanation: data.explanation,
        code_snippet: data.codeSnippet ?? null,
    }).eq("id", id);
}

export async function deleteEntry(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("solution_entries").delete().eq("id", id);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function fallbackMember(id: string): TeamMember {
    return { id, name: "Unknown", avatar: "?", status: "offline", role: "", email: "", password: "" };
}
