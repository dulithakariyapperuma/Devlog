// Auto-generated TypeScript types for the Supabase schema.
// You can regenerate this file by running:
//   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/database.types.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    name: string;
                    avatar: string;
                    status: "online" | "away" | "offline";
                    role: string;
                    email: string;
                    is_admin: boolean;
                    created_at: string;
                };
                Insert: {
                    id: string;
                    name: string;
                    avatar?: string;
                    status?: "online" | "away" | "offline";
                    role?: string;
                    email: string;
                    is_admin?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    avatar?: string;
                    status?: "online" | "away" | "offline";
                    role?: string;
                    email?: string;
                    is_admin?: boolean;
                    created_at?: string;
                };
            };
            projects: {
                Row: {
                    id: string;
                    name: string;
                    description: string;
                    status: "active" | "completed";
                    start_date: string;
                    end_date: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string;
                    status?: "active" | "completed";
                    start_date?: string;
                    end_date?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string;
                    status?: "active" | "completed";
                    start_date?: string;
                    end_date?: string | null;
                    updated_at?: string;
                };
            };
            project_members: {
                Row: {
                    project_id: string;
                    member_id: string;
                };
                Insert: {
                    project_id: string;
                    member_id: string;
                };
                Update: {
                    project_id?: string;
                    member_id?: string;
                };
            };
            solution_entries: {
                Row: {
                    id: string;
                    project_id: string;
                    author_id: string;
                    status: "resolved" | "in-progress";
                    title: string;
                    module: string;
                    error_message: string | null;
                    explanation: string;
                    code_snippet: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    project_id: string;
                    author_id: string;
                    status?: "resolved" | "in-progress";
                    title: string;
                    module: string;
                    error_message?: string | null;
                    explanation: string;
                    code_snippet?: string | null;
                    created_at?: string;
                };
                Update: {
                    status?: "resolved" | "in-progress";
                    title?: string;
                    module?: string;
                    error_message?: string | null;
                    explanation?: string;
                    code_snippet?: string | null;
                };
            };
            bug_reports: {
                Row: {
                    id: string;
                    title: string;
                    description: string;
                    steps_to_reproduce: string | null;
                    expected_behavior: string | null;
                    actual_behavior: string | null;
                    severity: "critical" | "high" | "medium" | "low";
                    priority: "urgent" | "high" | "normal" | "low";
                    status: "open" | "in-review" | "resolved" | "closed";
                    project_id: string;
                    module: string;
                    assignee_id: string | null;
                    reported_by_id: string;
                    screenshot_note: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description: string;
                    steps_to_reproduce?: string | null;
                    expected_behavior?: string | null;
                    actual_behavior?: string | null;
                    severity?: "critical" | "high" | "medium" | "low";
                    priority?: "urgent" | "high" | "normal" | "low";
                    status?: "open" | "in-review" | "resolved" | "closed";
                    project_id: string;
                    module: string;
                    assignee_id?: string | null;
                    reported_by_id: string;
                    screenshot_note?: string | null;
                };
                Update: {
                    title?: string;
                    description?: string;
                    steps_to_reproduce?: string | null;
                    expected_behavior?: string | null;
                    actual_behavior?: string | null;
                    severity?: "critical" | "high" | "medium" | "low";
                    priority?: "urgent" | "high" | "normal" | "low";
                    status?: "open" | "in-review" | "resolved" | "closed";
                    module?: string;
                    assignee_id?: string | null;
                    screenshot_note?: string | null;
                    updated_at?: string;
                };
            };
            chat_messages: {
                Row: {
                    id: string;
                    project_id: string;
                    author_id: string;
                    text: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    project_id: string;
                    author_id: string;
                    text: string;
                    created_at?: string;
                };
                Update: {
                    text?: string;
                };
            };
        };
        Views: Record<string, never>;
        Functions: {
            delete_user: {
                Args: { user_id: string };
                Returns: void;
            };
        };
        Enums: Record<string, never>;
    };
}
