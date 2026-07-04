# Devlog Backend API

Node.js + Express + Prisma + PostgreSQL — Multi-team REST API.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (see below)

### 1. Install Dependencies
```bash
cd devlog-backend
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Then edit .env with your values
```

### 3. Install & Start PostgreSQL (Mac)
```bash
# Install via Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create the database
createdb devlog_db
```

Your `DATABASE_URL` in `.env` should be:
```
DATABASE_URL="postgresql://postgres:@localhost:5432/devlog_db"
```

### 4. Run Database Migrations
```bash
npm run db:generate     # Generate Prisma client types
npm run db:migrate      # Create all tables in PostgreSQL
```

### 5. Seed the Super Admin
```bash
# First edit .env and set:
# SEED_ADMIN_EMAIL=admin@yourcompany.com
# SEED_ADMIN_PASSWORD=StrongPassword123!
# SEED_ADMIN_NAME=Your Name

npm run db:seed
```

### 6. Start the Server
```bash
npm run dev
# Server runs at http://localhost:3001
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new member (no team) |
| POST | `/api/auth/register-leader` | Register + create team (becomes TEAM_LEADER) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user + their teams |
| PATCH | `/api/auth/me` | Update name/avatar |
| POST | `/api/auth/logout` | Set status to offline |

### Teams
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/teams` | List my teams | Any |
| POST | `/api/teams` | Create a team | Any |
| GET | `/api/teams/:teamId` | Team details | Member+ |
| PATCH | `/api/teams/:teamId` | Update team | TEAM_LEADER+ |
| POST | `/api/teams/:teamId/join` | Join by slug | Any |
| GET | `/api/teams/:teamId/members` | List members | Member+ |
| PATCH | `/api/teams/:teamId/members/:userId/role` | Change role | TEAM_LEADER+ |
| DELETE | `/api/teams/:teamId/members/:userId` | Remove member | TEAM_LEADER+ |

### Projects
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/teams/:teamId/projects` | List projects | Member+ |
| POST | `/api/teams/:teamId/projects` | Create project | TEAM_LEADER+ |
| GET | `/api/teams/:teamId/projects/:id` | Project detail | Member+ |
| PATCH | `/api/teams/:teamId/projects/:id` | Update project | TEAM_LEADER+ |
| DELETE | `/api/teams/:teamId/projects/:id` | Delete project | TEAM_LEADER+ |

### Entries / Bugs / Chat / Knowledge
Nested under `/api/teams/:teamId/projects/:projectId/entries|bugs|chat`  
and `/api/teams/:teamId/knowledge`

---

## Roles

| Role | How to Get It | Can Do |
|---|---|---|
| `SUPER_ADMIN` | Set by seeder / admin promote | Manage all teams & users |
| `TEAM_LEADER` | Register via `/register-leader` | Manage team members & projects |
| `MEMBER` | Register normally, then join a team | Create entries, bugs, chat |

---

## Deploy (Free on Railway)

1. Push to GitHub
2. Create account at [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Add PostgreSQL plugin
5. Set environment variables (copy from `.env.example`)
6. Done! Railway gives you a public URL.
