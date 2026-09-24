# AI Project Orchestrator

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.x-0055FF?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Gemini](https://img.shields.io/badge/Powered_by-Gemini_3.8_Flash-8E75B2?style=flat-square&logo=google-gemini&logoColor=white)](https://ai.google.dev/)

**AI Project Orchestrator** is an automated software engineering platform that connects to codebases, breaks down project goals into dependency-aware task graphs, executes code changes sequentially, validates builds through isolated test runners, and presents human-in-the-loop diff reviews before committing to Git.

---

## Key Capabilities

### 1. Codebase Scanning & Deep Analytics
- **Repository Architecture Discovery**: Automatically indexes repository structure, identifying manifest configurations (`package.json`, `tsconfig.json`, `cargo.toml`, etc.), entry points, and test suites.
- **Language & Size Breakdown**: Computes exact file metrics, line counts, byte sizes, and language distributions with color-coded statistical distributions.
- **Project Architecture Facts**: Discovers and persists critical facts (runtime environment, test commands, linter configs, frameworks) to inform downstream code generation.

### 2. Goal Decomposition & Dynamic Planning
- **AI-Powered Task Generation**: Decomposes high-level engineering requirements into sequential, logically ordered implementation tasks with acceptance criteria.
- **Interactive Dual-View Interface**:
  - **Reorderable Task List**: Drag-and-drop or arrow-based task reordering with fluid layout animations.
  - **Interactive Kanban Board**: Column-based workflow stages (`Pending`, `In Progress`, `Needs Review`, `Completed`).
- **Framer-Motion Transitions**: Smooth spring physics on card entrances, status badge updates, and drag-and-drop reordering.

### 3. Sandboxed Task Execution Engine
- **Isolated Workspaces**: Changes are executed in independent project workspaces (`.workspaces/<projectId>`) on dedicated working branches (`ai/orchestrator-execution`), preserving the integrity of the default branch.
- **Context-Aware Code Generation**: Feeds targeted file trees, previous task outputs, and repository facts into Gemini 3.8 Flash (`@google/genai`) to generate clean unified diffs.
- **Structured File Operations**: Supports creation, modification, and deletion operations with path validation.

### 4. Automated Multi-Stage Validation & Self-Healing
- **Syntax, Type & Test Checks**: Runs linter commands, TypeScript compiler checks (`tsc --noEmit`), and automated test suites (`node --test`, `npm test`, etc.) directly against workspace changes.
- **Self-Healing Error Correction**: If a validation check fails, the orchestrator automatically classifies the error, captures terminal logs, and feeds the failure back into the AI to generate corrective patches.
- **Configurable Retry Policies**: Tracks retry attempts per task to prevent execution loops on hard architectural blockers.

### 5. Visual Diff Inspection & Human-in-the-Loop Review
- **Interactive Unified Diff Viewer**: Color-coded line-by-line additions, deletions, and context lines for each affected file.
- **One-Click Approval & Commits**: Review and approve code diffs, write custom commit messages, or reject tasks with revision feedback.
- **Instant Rollback**: Revert branch changes back to previous checkpoints if an unexpected side-effect occurs.

### 6. Git Branch Management & Audit Logging
- **Cryptographic Commit Records**: Tracks commit hashes, authors, messages, and timestamps.
- **Activity Stream**: Audit trail recording repository scans, plan generations, task executions, approvals, and validations.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18 (SPA), TypeScript |
| **Styling & Design** | Tailwind CSS v4, Lucide React Icons |
| **Animations** | Framer Motion (popLayout transitions, layout spring physics) |
| **Backend Server** | Node.js, Express, TSX |
| **AI SDK** | `@google/genai` (Gemini 3.8 Flash) |
| **Workspace & Git** | Native Git CLI via Node.js `child_process` in isolated working paths |
| **State Storage** | File-backed ACID-safe JSON store with atomic writes |

---

## Project Structure

```
├── .data/                  # Persistent database storage (users, projects, tasks, commits)
├── public/                 # Static web assets and icons
├── server/                 # Express backend application
│   ├── auth/               # Password hashing, user session tokens, and middleware
│   ├── db/                 # JSON file store models and database types
│   ├── routes/             # RESTful API route definitions
│   │   ├── auth-routes.ts
│   │   ├── health-routes.ts
│   │   ├── project-routes.ts
│   │   ├── repo-routes.ts
│   │   └── task-routes.ts
│   └── services/           # Core orchestration engine
│       ├── ai-provider.interface.ts # Pluggable AI interface
│       ├── gemini-provider.ts       # Google Gemini SDK integration
│       ├── workspace-manager.ts     # Sandboxed workspace & Git automation
│       ├── repo-scanner.ts          # Static file analysis & code metrics
│       ├── planner.ts               # Task plan generation & updates
│       ├── executor.ts              # Sequential execution & patch application
│       ├── validator.ts             # Test runner, typechecker & linter
│       └── github-service.ts        # GitHub cloning & demo workspace seeder
├── src/                    # Frontend React application
│   ├── components/
│   │   ├── auth/           # Login & registration modal dialogs
│   │   ├── execution/      # Task runner, diff viewer, timeline & stats
│   │   ├── layout/         # Header, status indicators, project switcher
│   │   ├── plan/           # Plan editor, task cards, reordering & Kanban
│   │   └── project/        # Codebase stats, facts, branch cards, project grid
│   ├── services/           # Client API service layer
│   ├── types/              # TypeScript interface definitions
│   ├── App.tsx             # Root orchestration view & state coordinator
│   └── main.tsx            # React application entry point
├── server.ts               # Main full-stack entry point (Express + Vite middlewares)
├── metadata.json           # Application platform configuration
├── package.json            # Node.js dependencies and script definitions
├── tsconfig.json           # TypeScript compiler configuration
└── vite.config.ts          # Vite build tool configuration
```

---

## Getting Started

### Prerequisites
- **Node.js**: Version 18.x or higher
- **npm** or **bun**: Latest stable release
- **Git**: Installed and accessible on your system `PATH`
- **Gemini API Key**: A valid key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ai-project-orchestrator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the project root based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at: `http://localhost:3000`

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck and API capability status |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate existing user |
| `POST` | `/api/auth/logout` | Terminate session |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile |
| `GET` | `/api/projects` | List all projects belonging to user |
| `POST` | `/api/projects` | Create a new project and initialize workspace |
| `GET` | `/api/projects/:id` | Get project details, tasks, facts, commits, and activity |
| `POST` | `/api/projects/:id/scan` | Trigger codebase scan and compute language stats |
| `POST` | `/api/projects/:id/plan/generate` | Generate or regenerate implementation plan with Gemini |
| `PUT` | `/api/projects/:id/plan/tasks` | Update task sequence, order, or statuses |
| `POST` | `/api/projects/:id/plan/approve` | Approve plan and transition project to execution |
| `POST` | `/api/tasks/:id/execute` | Execute task, generate code, and apply diff patch |
| `POST` | `/api/tasks/:id/approve` | Approve task diff, commit changes to Git branch |
| `POST` | `/api/tasks/:id/reject` | Reject task diff and request revision or rollback |
| `POST` | `/api/projects/:id/validate` | Run full validation suite across working branch |

---

## License

This project is licensed under the [MIT License](LICENSE).
