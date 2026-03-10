/**
 * bugService.ts
 * CRUD for bug reports.
 */
import { supabase } from "@/lib/supabase";
import type { BugReport } from "@/data/mockData";

type BugRow = {
    id: string;
    title: string;
    description: string;
    steps_to_reproduce: string | null;
    expected_behavior: string | null;
    actual_behavior: string | null;
    severity: string;
    priority: string;
    status: string;
    project_id: string;
    module: string;
    assignee_id: string | null;
    reported_by_id: string;
    screenshot_note: string | null;
    created_at: string;
    updated_at: string;
};

function rowToBug(row: BugRow): BugReport {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        stepsToReproduce: row.steps_to_reproduce ?? undefined,
        expectedBehavior: row.expected_behavior ?? undefined,
        actualBehavior: row.actual_behavior ?? undefined,
        severity: row.severity as BugReport["severity"],
        priority: row.priority as BugReport["priority"],
        status: row.status as BugReport["status"],
        projectId: row.project_id,
        module: row.module,
        assigneeId: row.assignee_id ?? undefined,
        reportedById: row.reported_by_id,
        screenshotNote: row.screenshot_note ?? undefined,
        timestamp: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export async function getBugReports(): Promise<BugReport[]> {
    const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as BugRow[]).map(rowToBug);
}

export async function createBugReport(
    bug: Omit<BugReport, "id" | "timestamp" | "updatedAt">
): Promise<BugReport | null> {
    const { data, error } = await supabase
        .from("bug_reports")
        .insert({
            title: bug.title,
            description: bug.description,
            steps_to_reproduce: bug.stepsToReproduce ?? null,
            expected_behavior: bug.expectedBehavior ?? null,
            actual_behavior: bug.actualBehavior ?? null,
            severity: bug.severity,
            priority: bug.priority,
            status: bug.status,
            project_id: bug.projectId,
            module: bug.module,
            assignee_id: bug.assigneeId ?? null,
            reported_by_id: bug.reportedById,
            screenshot_note: bug.screenshotNote ?? null,
        })
        .select()
        .single();

    if (error || !data) { console.error(error); return null; }
    return rowToBug(data as BugRow);
}

export async function updateBugReport(
    id: string,
    patch: Partial<Omit<BugReport, "id" | "timestamp">>
): Promise<void> {
    const { error } = await supabase.from("bug_reports").update({
        title: patch.title,
        description: patch.description,
        steps_to_reproduce: patch.stepsToReproduce ?? null,
        expected_behavior: patch.expectedBehavior ?? null,
        actual_behavior: patch.actualBehavior ?? null,
        severity: patch.severity,
        priority: patch.priority,
        status: patch.status,
        module: patch.module,
        assignee_id: patch.assigneeId ?? null,
        screenshot_note: patch.screenshotNote ?? null,
    }).eq("id", id);

    if (error) console.error(error);
}

export async function deleteBugReport(id: string): Promise<void> {
    await supabase.from("bug_reports").delete().eq("id", id);
}
