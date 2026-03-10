# DevLog Live Feed

DevLog Live Feed is a real-time collaborative platform designed for development teams to log solutions, track projects, manage bugs, and communicate seamlessly. Built with React, Vite, and Supabase, it provides a centralized hub for engineering knowledge sharing and workflow transparency.

## Key Features

- **Real-Time Developer Feed:** Log your solutions, share code snippets, and post updates instantly. Everyone on the team sees new entries on a live timeline.
- **Project Management:** Create, track, and manage development projects, including assigning members, setting statuses (Active/Completed), and handling timelines.
- **QA & Bug Tracking:** Integrated bug reporting and tracking (Open/In Progress/Resolved) directly within your workspaces.
- **Team Collaboration & Presence:** See who is online with real-time presence, view team assignments, and communicate through built-in project group chats and direct messaging.
- **Knowledge Base Search:** A powerful global search designed to find past solutions, code modules, and error explanations instantly.
- **Beautiful UI:** A sleek, fully featured UI built with Tailwind CSS, Shadcn UI, dark mode support, and seamless animations.

## Tech Stack

- **Frontend Framework:** React 18, Vite, TypeScript
- **Styling & Components:** Tailwind CSS, Shadcn UI (Radix UI), Lucide Icons
- **Backend Service:** Supabase (Database, Authentication, Real-Time Subscriptions)
- **Data Fetching:** `@tanstack/react-query`
- **Routing:** React Router v6
- **Forms & Validation:** React Hook Form, Zod

## Getting Started

### Prerequisites

- Node.js & npm installed - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- A Supabase project set up for database, auth, and real-time functionality.

### Installation & Setup

1. **Clone the repository:**
   ```sh
   git clone <YOUR_GIT_URL>
   cd devlog-live-feed
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root of the project (you can use `.env.example` as a template) and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server:**
   ```sh
   npm run dev
   ```

5. **Open the app:**
   Navigate to `http://localhost:5173` in your browser.

## Project Structure

- `/src/components` - UI components and domain specific sections (e.g., Timeline, EntryFormModal, QAView).
- `/src/pages` - Application route components (`Index.tsx`, `LoginPage.tsx`, etc.).
- `/src/services` - Logic for interacting with the backend and Supabase (`projectService`, `bugService`, `chatService`).
- `/src/context` - React contexts containing global application state for Auth and Chat.
- `/src/data` - Local mock data implementation.
- `/src/lib` - Core utilities and Supabase client configuration.

## Contributing

Contributions are welcome on Ifinity Dev Team! Please feel free to submit a Pull Request or open an issue for bug reports and feature requests.

## License

This is not open source. This is a private project for Ifinity Dev Team. all rights reserved. Devlog © 2026.   
