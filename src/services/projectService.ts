/**
 * src/services/projectService.ts
 * ─────────────────────────────────────────────────────
 * CRUD for Projects and Solution Entries.
 * All routes are scoped under a teamId.
 */
import api from "@/lib/apiClient";
import type { Project, SolutionEntry, TeamMember } from "@/data/mockData";

// ── Types from API ────────────────────────────────────────────────────────────

interface ApiAuthor {
  id: string;
  name: string;
  avatar: string;
}

interface ApiEntry {
  id: string;
  title: string;
  module: string;
  status: string;
  errorMessage: string | null;
  explanation: string;
  codeSnippet: string | null;
  createdAt: string;
  author: ApiAuthor | null;
}

interface ApiProject {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  memberIds: string[];
  members: ApiAuthor[];
  entries: ApiEntry[];
  bugs: unknown[];
  entryCount?: number;
  bugCount?: number;
  messageCount?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiEntryToEntry(e: ApiEntry, membersMap: Map<string, TeamMember>): SolutionEntry {
  const author: TeamMember = e.author
    ? {
        id: e.author.id,
        name: e.author.name,
        avatar: e.author.avatar,
        status: "online",
        role: "",
        email: "",
        password: "",
      }
    : membersMap.get("") ?? {
        id: "unknown",
        name: "Unknown",
        avatar: "?",
        status: "offline",
        role: "",
        email: "",
        password: "",
      };

  return {
    id: e.id,
    author,
    status: e.status as SolutionEntry["status"],
    title: e.title,
    module: e.module,
    errorMessage: e.errorMessage ?? undefined,
    explanation: e.explanation,
    codeSnippet: e.codeSnippet ?? undefined,
    timestamp: new Date(e.createdAt),
  };
}

function apiProjectToProject(
  p: ApiProject,
  membersMap: Map<string, TeamMember>
): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    status: p.status as Project["status"],
    startDate: new Date(p.startDate),
    endDate: p.endDate ? new Date(p.endDate) : undefined,
    memberIds: p.memberIds,
    entries: (p.entries ?? []).map((e) => apiEntryToEntry(e, membersMap)),
    groupMessages: [],
  };
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(
  teamId: string,
  membersMap: Map<string, TeamMember>
): Promise<Project[]> {
  try {
    const { data } = await api.get<ApiProject[]>(`/teams/${teamId}/projects`);
    return data.map((p) => apiProjectToProject(p, membersMap));
  } catch (err) {
    console.error("[projectService] getProjects:", err);
    return [];
  }
}

export async function getProject(
  teamId: string,
  projectId: string,
  membersMap: Map<string, TeamMember>
): Promise<Project | null> {
  try {
    const { data } = await api.get<ApiProject>(
      `/teams/${teamId}/projects/${projectId}`
    );
    return apiProjectToProject(data, membersMap);
  } catch (err) {
    console.error("[projectService] getProject:", err);
    return null;
  }
}

export async function createProject(
  teamId: string,
  data: {
    name: string;
    description: string;
    status: Project["status"];
    startDate: Date;
    endDate?: Date;
  },
  memberIds: string[]
): Promise<Project | null> {
  try {
    const { data: row } = await api.post<ApiProject>(
      `/teams/${teamId}/projects`,
      {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate.toISOString().split("T")[0],
        endDate: data.endDate
          ? data.endDate.toISOString().split("T")[0]
          : undefined,
        memberIds,
      }
    );
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      status: row.status as Project["status"],
      startDate: new Date(row.startDate ?? data.startDate),
      endDate: row.endDate ? new Date(row.endDate) : undefined,
      memberIds,
      entries: [],
      groupMessages: [],
    };
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ?? "Failed to create project";
    window.alert(msg);
    return null;
  }
}

export async function updateProject(
  teamId: string,
  id: string,
  data: Partial<{
    name: string;
    description: string;
    status: Project["status"];
    startDate: Date;
    endDate?: Date;
  }>,
  memberIds?: string[]
): Promise<void> {
  const patch: Record<string, unknown> = { ...data };
  if (data.startDate) patch.startDate = data.startDate.toISOString().split("T")[0];
  if (data.endDate) patch.endDate = data.endDate.toISOString().split("T")[0];

  await api.patch(`/teams/${teamId}/projects/${id}`, patch);

  // Re-sync members if provided
  if (memberIds !== undefined) {
    // Get current members and diff
    const { data: current } = await api.get<ApiProject>(
      `/teams/${teamId}/projects/${id}`
    );
    const currentIds = new Set(current.memberIds);
    const newIds = new Set(memberIds);

    // Add new members
    for (const uid of newIds) {
      if (!currentIds.has(uid)) {
        await api.post(`/teams/${teamId}/projects/${id}/members`, { userId: uid });
      }
    }
    // Remove removed members
    for (const uid of currentIds) {
      if (!newIds.has(uid)) {
        await api.delete(`/teams/${teamId}/projects/${id}/members/${uid}`);
      }
    }
  }
}

export async function deleteProject(teamId: string, id: string): Promise<void> {
  await api.delete(`/teams/${teamId}/projects/${id}`);
}

// ── Solution Entries ──────────────────────────────────────────────────────────

export async function createEntry(
  teamId: string,
  projectId: string,
  data: Omit<SolutionEntry, "id" | "author" | "timestamp">
): Promise<void> {
  await api.post(`/teams/${teamId}/projects/${projectId}/entries`, {
    title: data.title,
    module: data.module,
    status: data.status,
    errorMessage: data.errorMessage,
    explanation: data.explanation,
    codeSnippet: data.codeSnippet,
  });
}

export async function updateEntry(
  teamId: string,
  projectId: string,
  id: string,
  data: Partial<Omit<SolutionEntry, "id" | "author" | "timestamp">>
): Promise<void> {
  await api.patch(`/teams/${teamId}/projects/${projectId}/entries/${id}`, data);
}

export async function deleteEntry(
  teamId: string,
  projectId: string,
  id: string
): Promise<void> {
  await api.delete(`/teams/${teamId}/projects/${projectId}/entries/${id}`);
}
