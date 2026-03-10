export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "away" | "offline";
  role: string;
  email: string;
  password: string; // mock only — never do this in production
  isAdmin?: boolean;
}

export interface SolutionEntry {
  id: string;
  author: TeamMember;
  status: "resolved" | "in-progress";
  title: string;
  module: string;
  errorMessage?: string;
  explanation: string;
  codeSnippet?: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  timestamp: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed";
  startDate: Date;
  endDate?: Date;
  entries: SolutionEntry[];
  memberIds: string[];
  groupMessages: ChatMessage[];
}

export type BugSeverity = "critical" | "high" | "medium" | "low";
export type BugPriority = "urgent" | "high" | "normal" | "low";
export type BugStatus = "open" | "in-review" | "resolved" | "closed";

export interface BugReport {
  id: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  projectId: string;
  module: string;
  assigneeId?: string;  // developer assigned to fix it
  reportedById: string; // QA member who filed it
  timestamp: Date;
  updatedAt: Date;
  screenshotNote?: string;
}

export const teamMembers: TeamMember[] = [
  { id: "1", name: "Dulitha Kariyapperuma", avatar: "DK", status: "online", role: "Intern", email: "dulitha@devlog.io", password: "pass123" },
  { id: "2", name: "Iman Salam", avatar: "CS", status: "online", role: "Associate Engineer", email: "iman@devlog.io", password: "pass123" },
  { id: "3", name: "Ravindu", avatar: "NP", status: "away", role: "Associate Engineer", email: "ravindu@devlog.io", password: "pass123" },
  { id: "4", name: "Saviru", avatar: "SL", status: "online", role: "Associate Engineer", email: "saviru@devlog.io", password: "pass123" },
  { id: "5", name: "Vidam", avatar: "AP", status: "offline", role: "Associate Engineer", email: "vidam@devlog.io", password: "pass123" },
];

// ─── Project 1: Dashboard Rebuild (completed) ─────────────────────────────────
const dashboardEntries: SolutionEntry[] = [
  {
    id: "p1-1", author: teamMembers[1], status: "resolved",
    title: 'The "Environment Mismatch" Error', module: "Backend / Auth-Service",
    errorMessage: "Error: Client network socket disconnected before secure TLS connection was established",
    explanation: "The issue was caused by a mismatch in Node.js HTTP header size limits. Increasing the max header size and reinstalling dependencies resolved the TLS handshake failure.",
    codeSnippet: `export NODE_OPTIONS='--max-http-header-size=16384'\nnpm install`,
    timestamp: new Date("2026-02-22T14:20:00"),
  },
  {
    id: "p1-2", author: teamMembers[0], status: "in-progress",
    title: "Worked on Bug #123", module: "Frontend / Dashboard",
    explanation: "Investigating a race condition in the dashboard data fetching. The useEffect cleanup isn't cancelling pending requests properly.",
    codeSnippet: `useEffect(() => {\n  const controller = new AbortController();\n  fetchData({ signal: controller.signal });\n  return () => controller.abort();\n}, []);`,
    timestamp: new Date("2026-02-22T10:45:00"),
  },
  {
    id: "p1-3", author: teamMembers[3], status: "resolved",
    title: "JWT Token Refresh Loop", module: "Backend / Auth-Service",
    errorMessage: "Error: Maximum call stack size exceeded during token refresh",
    explanation: "The refresh token interceptor was re-triggering itself. Added a flag to prevent recursive refresh attempts.",
    codeSnippet: `let isRefreshing = false;\n\naxios.interceptors.response.use(\n  (res) => res,\n  async (error) => {\n    if (error.response?.status === 401 && !isRefreshing) {\n      isRefreshing = true;\n      await refreshToken();\n      isRefreshing = false;\n      return axios(error.config);\n    }\n    return Promise.reject(error);\n  }\n);`,
    timestamp: new Date("2026-02-20T16:30:00"),
  },
  {
    id: "p1-4", author: teamMembers[2], status: "in-progress",
    title: "Database Migration Failing", module: "DevOps / CI-CD",
    explanation: "The migration script is timing out on the staging environment. Looking into connection pool settings and query optimization.",
    timestamp: new Date("2026-02-20T11:00:00"),
  },
  {
    id: "p1-5", author: teamMembers[4], status: "resolved",
    title: "CORS Policy Blocking API", module: "Backend / API Gateway",
    errorMessage: "Access to XMLHttpRequest has been blocked by CORS policy",
    explanation: "Added proper CORS headers to the API gateway config. The issue was that the preflight OPTIONS request wasn't being handled.",
    codeSnippet: `app.use(cors({\n  origin: ['https://app.devlog.io'],\n  methods: ['GET', 'POST', 'PUT', 'DELETE'],\n  credentials: true,\n}));`,
    timestamp: new Date("2026-02-19T17:10:00"),
  },
  {
    id: "p1-6", author: teamMembers[0], status: "resolved",
    title: "Webpack Bundle Size Exceeds Limit", module: "Frontend / Build",
    errorMessage: "WARNING: Bundle size 4.2 MB exceeds recommended limit of 2 MB",
    explanation: "Replaced moment.js with date-fns and lazy-loaded three heavy chart components. Bundle dropped to 1.8 MB.",
    codeSnippet: `const ChartComponent = React.lazy(() => import('./ChartComponent'));\n\nimport { format } from 'date-fns';`,
    timestamp: new Date("2026-02-19T09:50:00"),
  },
  {
    id: "p1-7", author: teamMembers[3], status: "resolved",
    title: "Redis Cache Invalidation Bug", module: "Backend / Cache Layer",
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'cache')",
    explanation: "The cache key was being generated before the user session was fully initialised. Moving the key generation inside the session callback fixed it.",
    codeSnippet: `session.on('init', (ctx) => {\n  const key = generateCacheKey(ctx.userId);\n  redis.set(key, ctx.data, 'EX', 3600);\n});`,
    timestamp: new Date("2026-02-18T15:30:00"),
  },
  {
    id: "p1-8", author: teamMembers[2], status: "in-progress",
    title: "CI Pipeline Flaky Tests", module: "DevOps / Testing",
    explanation: "Three integration tests fail intermittently on the CI runner but always pass locally. Likely a timing issue with async test setup. Investigating jest fake timers.",
    timestamp: new Date("2026-02-18T10:15:00"),
  },
];

// ─── Project 2: Mobile App — React Native (active) ────────────────────────────
const mobileEntries: SolutionEntry[] = [
  {
    id: "p2-1", author: teamMembers[2], status: "resolved",
    title: "Metro Bundler Crashing on Startup", module: "Frontend / React Native",
    errorMessage: "Error: EMFILE: too many open files, watch",
    explanation: "Watchman wasn't cleaning up file watchers between reloads. Running `watchman watch-del-all` and bumping the system file descriptor limit resolved it permanently.",
    codeSnippet: `watchman watch-del-all\nulimit -n 10240`,
    timestamp: new Date("2026-02-15T11:30:00"),
  },
  {
    id: "p2-2", author: teamMembers[0], status: "resolved",
    title: "Android Build: Duplicate Resources", module: "Frontend / Android",
    errorMessage: "AAPT: error: duplicate value for resource 'attr/colorPrimary'",
    explanation: "Two third-party libraries were both defining the same colour attribute. Added a `<resources>` override in `res/values/styles.xml` to pin the conflicting value.",
    codeSnippet: `<!-- res/values/styles.xml -->\n<resources>\n  <item name="colorPrimary" type="attr" format="color" />\n</resources>`,
    timestamp: new Date("2026-02-15T09:00:00"),
  },
  {
    id: "p2-3", author: teamMembers[3], status: "in-progress",
    title: "Push Notifications Not Arriving on iOS", module: "Backend / Notifications",
    explanation: "APNs token is being registered correctly but notifications are silently dropped. Suspect a mismatch between sandbox and production environment certificates. Investigating.",
    timestamp: new Date("2026-02-14T16:45:00"),
  },
  {
    id: "p2-4", author: teamMembers[1], status: "resolved",
    title: "Keyboard Overlapping Input Fields", module: "Frontend / React Native",
    explanation: "Used `KeyboardAvoidingView` with `behavior='padding'` on iOS and `behavior='height'` on Android. Combined with `ScrollView` this keeps the active input visible.",
    codeSnippet: `<KeyboardAvoidingView\n  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}\n  style={{ flex: 1 }}\n>\n  <ScrollView keyboardShouldPersistTaps="handled">\n    {/* form fields */}\n  </ScrollView>\n</KeyboardAvoidingView>`,
    timestamp: new Date("2026-02-13T14:00:00"),
  },
];

// ─── Project 3: API Gateway v2 (active) ───────────────────────────────────────
const gatewayEntries: SolutionEntry[] = [
  {
    id: "p3-1", author: teamMembers[4], status: "resolved",
    title: "Rate Limiter Rejecting Internal Services", module: "Backend / API Gateway",
    errorMessage: "HTTP 429 Too Many Requests from internal health-check endpoint",
    explanation: "Internal services were hitting the public rate limit bucket. Added an IP allowlist for private CIDR ranges so they bypass the limiter entirely.",
    codeSnippet: `const INTERNAL_CIDRS = ['10.0.0.0/8', '172.16.0.0/12'];\n\nif (isInCIDR(req.ip, INTERNAL_CIDRS)) {\n  return next();\n}`,
    timestamp: new Date("2026-02-10T13:20:00"),
  },
  {
    id: "p3-2", author: teamMembers[2], status: "in-progress",
    title: "GraphQL Subscription Memory Leak", module: "Backend / GraphQL",
    errorMessage: "Process heap size grew from 200 MB to 2.4 GB over 6 hours",
    explanation: "WebSocket connections for subscriptions are not being cleaned up when clients disconnect abruptly. Working on adding a ping/pong heartbeat to detect and close stale connections.",
    timestamp: new Date("2026-02-10T10:00:00"),
  },
  {
    id: "p3-3", author: teamMembers[0], status: "resolved",
    title: "OpenAPI Schema Validation Failing", module: "Backend / API Gateway",
    explanation: "Nullable fields in the schema were being rejected by the strict validator. Updated all optional response fields to use `oneOf: [type, null]` per OpenAPI 3.1 spec.",
    codeSnippet: `# Before\nnullable: true\n\n# After (OpenAPI 3.1)\noneOf:\n  - type: string\n  - type: 'null'`,
    timestamp: new Date("2026-02-08T15:45:00"),
  },
];

export const initialProjects: Project[] = [
  {
    id: "proj-1", name: "Dashboard Rebuild",
    description: "Full rebuild of the internal analytics dashboard — new design system, real-time data hooks, and performance improvements.",
    status: "completed", startDate: new Date("2026-02-12"), endDate: new Date("2026-02-22"),
    entries: dashboardEntries,
    memberIds: ["1", "2", "3", "4", "5"],
    groupMessages: [],
  },
  {
    id: "proj-2", name: "Mobile App — React Native",
    description: "Cross-platform mobile client for iOS and Android. Covers auth, push notifications, and offline sync.",
    status: "active", startDate: new Date("2026-02-10"),
    entries: mobileEntries,
    memberIds: ["1", "3", "4"],
    groupMessages: [],
  },
  {
    id: "proj-3", name: "API Gateway v2",
    description: "Rewriting the API gateway layer with built-in rate limiting, GraphQL subscriptions, and OpenAPI 3.1 validation.",
    status: "active", startDate: new Date("2026-02-05"),
    entries: gatewayEntries,
    memberIds: ["1", "2", "5"],
    groupMessages: [],
  },
];

// Kept for backwards compatibility
export const solutionEntries = dashboardEntries;

// ─── Mock Bug Reports ─────────────────────────────────────────────────────────
export const initialBugReports: BugReport[] = [
  {
    id: "bug-1",
    title: "Dashboard chart flickers on data refresh",
    description: "The bar chart on the analytics dashboard flickers and briefly shows an empty state every time live data is polled (every 5s). Very visible on slower connections.",
    stepsToReproduce: "1. Log in and navigate to Dashboard\n2. Wait 5 seconds for the auto-refresh\n3. Observe the chart area — it blanks out for ~200ms",
    expectedBehavior: "Chart should update in-place without any visible blank/flash state.",
    actualBehavior: "Chart unmounts and remounts on each refresh cycle causing a noticeable flicker.",
    severity: "high",
    priority: "high",
    status: "open",
    projectId: "proj-1",
    module: "Frontend / Dashboard",
    assigneeId: "1",
    reportedById: "3",
    timestamp: new Date("2026-02-23T09:15:00"),
    updatedAt: new Date("2026-02-23T09:15:00"),
    screenshotNote: "Screen recording shared in #qa-bugs Slack channel",
  },
  {
    id: "bug-2",
    title: "Login session expires without warning",
    description: "Users are silently logged out after 30 minutes of inactivity. There is no warning toast or redirect message — they simply see a blank screen after submitting a form.",
    stepsToReproduce: "1. Log in\n2. Leave the tab idle for 30+ minutes\n3. Attempt to submit any form",
    expectedBehavior: "Show a session-expiry warning dialog 2 minutes before logout with an option to extend.",
    actualBehavior: "User is silently redirected to login with no feedback.",
    severity: "high",
    priority: "urgent",
    status: "in-review",
    projectId: "proj-1",
    module: "Backend / Auth-Service",
    assigneeId: "4",
    reportedById: "3",
    timestamp: new Date("2026-02-22T14:00:00"),
    updatedAt: new Date("2026-02-23T10:30:00"),
  },
  {
    id: "bug-3",
    title: "Push notification badge count not resetting",
    description: "After reading all notifications, the red badge counter on the app icon (iOS) stays at the previous unread count. Force-quitting and reopening the app resolves it.",
    stepsToReproduce: "1. Receive 3+ push notifications\n2. Open the app and read all of them\n3. Exit the app — badge count stays on home screen",
    expectedBehavior: "Badge count should reset to 0 once all notifications are read.",
    actualBehavior: "Badge count is not cleared on the client after marking notifications as read.",
    severity: "medium",
    priority: "normal",
    status: "open",
    projectId: "proj-2",
    module: "Backend / Notifications",
    assigneeId: "4",
    reportedById: "2",
    timestamp: new Date("2026-02-21T11:40:00"),
    updatedAt: new Date("2026-02-21T11:40:00"),
    screenshotNote: "iPhone 15 Pro — iOS 17.3.1",
  },
  {
    id: "bug-4",
    title: "Offline sync overwrites newer server data",
    description: "When the device reconnects after offline use, local changes blindly overwrite the server state even when the server version is newer (e.g., updated by another user on web).",
    stepsToReproduce: "1. Open app online, note current data\n2. Enable airplane mode\n3. Make a change on mobile\n4. On web, make a different change to the same record\n5. Turn off airplane mode — mobile change wins incorrectly",
    expectedBehavior: "Conflict resolution dialog should appear, or server-wins policy should be applied for stale local edits.",
    actualBehavior: "Local offline change unconditionally overwrites the server record.",
    severity: "critical",
    priority: "urgent",
    status: "open",
    projectId: "proj-2",
    module: "Frontend / React Native",
    assigneeId: "3",
    reportedById: "2",
    timestamp: new Date("2026-02-20T16:20:00"),
    updatedAt: new Date("2026-02-20T16:20:00"),
  },
  {
    id: "bug-5",
    title: "Rate limit headers missing on 200 responses",
    description: "The `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers are present on 429 error responses but are completely absent from successful 200 responses, making client-side throttling impossible.",
    stepsToReproduce: "1. Call any public API endpoint (e.g., GET /api/v2/users)\n2. Inspect response headers\n3. Headers X-RateLimit-Remaining and X-RateLimit-Reset are missing",
    expectedBehavior: "Rate limit headers should be included on every response regardless of status code.",
    actualBehavior: "Headers only appear on 429 responses.",
    severity: "medium",
    priority: "high",
    status: "resolved",
    projectId: "proj-3",
    module: "Backend / API Gateway",
    assigneeId: "5",
    reportedById: "3",
    timestamp: new Date("2026-02-18T13:00:00"),
    updatedAt: new Date("2026-02-20T09:00:00"),
  },
  {
    id: "bug-6",
    title: "GraphQL subscription drops on reconnect",
    description: "When the WebSocket connection is briefly interrupted (e.g., switching from WiFi to cellular), the GraphQL subscription is not automatically re-established. The UI silently stops receiving real-time updates.",
    stepsToReproduce: "1. Open a page with live subscription data\n2. Disconnect & reconnect WiFi\n3. Make a change on another browser tab — original tab does not update",
    expectedBehavior: "Subscription should reconnect automatically within 3 seconds with exponential backoff.",
    actualBehavior: "Subscription is permanently dropped. User must refresh the page.",
    severity: "high",
    priority: "high",
    status: "in-review",
    projectId: "proj-3",
    module: "Backend / GraphQL",
    assigneeId: "3",
    reportedById: "2",
    timestamp: new Date("2026-02-17T10:30:00"),
    updatedAt: new Date("2026-02-19T14:15:00"),
  },
  {
    id: "bug-7",
    title: "Calendar date picker returns wrong month on timezone boundary",
    description: "Selecting a date near midnight in IST (UTC+5:30) returns the previous day's date in the API payload because the component converts to UTC before serialising.",
    stepsToReproduce: "1. Set system timezone to IST\n2. Open any date picker and select today\n3. Submit the form — API receives yesterday's date",
    expectedBehavior: "Selected date should be stored as the calendar date the user clicked, independent of timezone.",
    actualBehavior: "Date shifts backwards by one day for timezones east of UTC.",
    severity: "medium",
    priority: "high",
    status: "open",
    projectId: "proj-1",
    module: "Frontend / Dashboard",
    assigneeId: "1",
    reportedById: "3",
    timestamp: new Date("2026-02-16T08:00:00"),
    updatedAt: new Date("2026-02-16T08:00:00"),
    screenshotNote: "Reproduced on macOS 14, Chrome 122 & Safari 17",
  },
  {
    id: "bug-8",
    title: "File upload silently fails above 8 MB",
    description: "Uploading a file larger than 8 MB shows the progress bar completing to 100% and then the upload disappears with no error message. The file is not saved.",
    stepsToReproduce: "1. Navigate to any file upload component\n2. Select a file > 8 MB\n3. Watch the progress bar reach 100%\n4. No success toast appears; file is absent from the list",
    expectedBehavior: "An error message should inform the user of the file size limit before or during upload.",
    actualBehavior: "Upload silently fails with no user-facing feedback.",
    severity: "high",
    priority: "normal",
    status: "closed",
    projectId: "proj-1",
    module: "Backend / API Gateway",
    assigneeId: "5",
    reportedById: "2",
    timestamp: new Date("2026-02-14T15:20:00"),
    updatedAt: new Date("2026-02-17T11:00:00"),
  },
];

