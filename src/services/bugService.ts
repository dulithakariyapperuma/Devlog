/**
 * src/services/bugService.ts
 * ─────────────────────────────────────────────────────
 * Bug report CRUD — replaces Supabase calls.
 */
import api from "@/lib/apiClient";
import type { BugReport } from "@/data/mockData";

interface ApiBug {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  severity: string;
  priority: string;
  status: string;
  module: string;
  assigneeId: string | null;
  reportedById: string | null;
  screenshotNote: string | null;
  createdAt: string;
  updatedAt: string;
}

function apiBugToBugReport(b: ApiBug): BugReport {
  return {
    id: b.id,
    title: b.title,
    description: b.description ?? "",
    stepsToReproduce: b.stepsToReproduce ?? undefined,
    expectedBehavior: b.expectedBehavior ?? undefined,
    actualBehavior: b.actualBehavior ?? undefined,
    severity: b.severity as BugReport["severity"],
    priority: b.priority as BugReport["priority"],
    status: b.status as BugReport["status"],
    projectId: b.projectId,
    module: b.module,
    assigneeId: b.assigneeId ?? undefined,
    reportedById: b.reportedById ?? "",
    screenshotNote: b.screenshotNote ?? undefined,
    timestamp: new Date(b.createdAt),
    updatedAt: new Date(b.updatedAt),
  };
}

export async function getBugReports(
  teamId: string,
  projectId: string
): Promise<BugReport[]> {
  try {
    const { data } = await api.get<ApiBug[]>(
      `/teams/${teamId}/projects/${projectId}/bugs`
    );
    return data.map(apiBugToBugReport);
  } catch (err) {
    console.error("[bugService] getBugReports:", err);
    return [];
  }
}

export async function createBugReport(
  teamId: string,
  bug: Omit<BugReport, "id" | "timestamp" | "updatedAt">
): Promise<BugReport | null> {
  try {
    const { data } = await api.post<ApiBug>(
      `/teams/${teamId}/projects/${bug.projectId}/bugs`,
      {
        title: bug.title,
        description: bug.description,
        stepsToReproduce: bug.stepsToReproduce,
        expectedBehavior: bug.expectedBehavior,
        actualBehavior: bug.actualBehavior,
        severity: bug.severity,
        priority: bug.priority,
        status: bug.status,
        module: bug.module,
        assigneeId: bug.assigneeId,
        screenshotNote: bug.screenshotNote,
      }
    );
    return apiBugToBugReport(data);
  } catch (err) {
    console.error("[bugService] createBugReport:", err);
    return null;
  }
}

export async function updateBugReport(
  teamId: string,
  projectId: string,
  id: string,
  patch: Partial<Omit<BugReport, "id" | "timestamp">>
): Promise<void> {
  try {
    await api.patch(`/teams/${teamId}/projects/${projectId}/bugs/${id}`, patch);
  } catch (err) {
    console.error("[bugService] updateBugReport:", err);
  }
}

export async function deleteBugReport(
  teamId: string,
  projectId: string,
  id: string
): Promise<void> {
  await api.delete(`/teams/${teamId}/projects/${projectId}/bugs/${id}`);
}
