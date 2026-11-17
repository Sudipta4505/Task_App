# TaskFlow AI — Full-Stack AI-Powered Task Management System

A production-grade MERN stack Task Management application featuring Firebase Authentication, an AI Chatbot powered by Google Gemini, and controlled Model Context Protocol (MCP) task tools.

---

## 🏗 Architecture

```
                  ┌───────────────────────────────────────┐
                  │          React 19 + Vite UI           │
                  │   Modern Dashboard & AI Chat Drawer   │
                  └──────────────────┬────────────────────┘
                                     │
                    Firebase Auth    │  REST API
                   (Email & Google)  │  (Bearer Token)
                                     ▼
                  ┌───────────────────────────────────────┐
                  │         Node.js + Express API         │
                  │  Firebase Admin Token Auth Middleware │
                  └───────┬───────────────────────┬───────┘
                          │                       │
              REST CRUD   │                       │  AI Queries &
              Controllers │                       │  Function Calling
                          ▼                       ▼
            ┌───────────────────┐       ┌───────────────────┐
            │   Task Controller │       │   AI Controller   │
            │  (User-Isolated)  │       │ (Gemini 1.5 Flash)│
            └─────────┬─────────┘       └─────────┬─────────┘
                      │                           │
                      │                           ▼
                      │                 ┌───────────────────┐
                      │                 │  MCP Task Tools   │
                      │                 │   - getMyTasks    │
                      │                 │   - createMyTask  │
                      │                 │   - updateMyTask  │
                      │                 │   - deleteMyTask  │
                      │                 └─────────┬─────────┘
                      │                           │
                      ▼                           ▼
            ┌───────────────────────────────────────────────┐
            │         MongoDB Database (Mongoose)           │
            │           Strict User-Scoped Data             │
            └───────────────────────────────────────────────┘
```

---

## 🔒 Security & Authorization

- **User Isolation**: Every database query and MCP tool invocation strictly validates and enforces `userId` from the verified Firebase Auth ID token. Users can never read, modify, or delete tasks belonging to other users.
- **AI Sandboxing**: The AI has **zero** direct access to MongoDB. All task operations are conducted through controlled MCP tool functions with parameter validations and enforced user scoping.
- **Secret Management**: API keys and credentials are stored strictly in environment variables (`.env`).

---

## 🛠 Features

1. **Frontend (React + Vite)**:
   - Modern obsidian glassmorphism UI with vibrant accents, micro-animations, and responsive layouts.
   - Firebase Authentication: Email/Password registration & login + Google One-Click Sign-In.
   - Real-time Task Metrics Dashboard (Total, Pending, In Progress, Completed, Urgent).
   - Task filtering by status (All, Pending, In Progress, Completed), priority levels, search keywords, and due dates.
   - Create, edit, delete, and complete tasks with instant visual feedback.
   - Interactive AI Chat Drawer with natural language prompt chips and MCP tool execution badges.

2. **Backend (Node.js + Express + Mongoose)**:
   - Clean MVC structure (`controllers`, `models`, `routes`, `middleware`, `config`, `mcp`).
   - MongoDB integration via Mongoose with optimized compound indexes.
   - Firebase ID token verification middleware (`requireAuth`).

3. **AI Chatbot (Google Gemini + MCP Function Calling)**:
   - Understands natural language commands:
     - *"Show my pending tasks."*
     - *"Create a task called Learn React."*
     - *"Mark my Learn React task as completed."*
     - *"Delete my old task."*
     - *"Show my tasks for tomorrow."*
   - Built-in resilient natural language fallback engine that works even before a Gemini API key is configured.

4. **Model Context Protocol (MCP) Server**:
   - Implements official `@modelcontextprotocol/sdk`.
   - Controlled tools:
     - `getMyTasks(status, priority, search, dueBefore, dueAfter)`
     - `createMyTask(title, description, priority, dueDate, tags)`
     - `updateMyTask(taskId, searchTitle, title, description, status, priority, dueDate, tags)`
     - `deleteMyTask(taskId, searchTitle)`
   - Can be run standalone via `npm run mcp`.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** running locally on port `27017` or a MongoDB Atlas connection string.

### 2. Environment Configuration

#### Backend (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/task_management_db
FIREBASE_PROJECT_ID=task-app-b709e
CLIENT_URL=http://localhost:5173

# Optional: Google Gemini API Key for AI Model
GEMINI_API_KEY=

# Optional: Path to Firebase Service Account JSON file (if custom admin credentials are used)
FIREBASE_SERVICE_ACCOUNT_PATH=
```

#### Frontend (`client/.env`):
```env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=task-app-b709e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=task-app-b709e
VITE_FIREBASE_STORAGE_BUCKET=task-app-b709e.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 3. Running the Application

In the root directory, you can start the backend and frontend:

#### Start Backend:
```bash
npm run server
```
*(Backend runs at http://localhost:5000)*

#### Start Frontend:
```bash
npm run client
```
*(Frontend runs at http://localhost:5173)*

#### Run Standalone MCP Server:
```bash
npm run mcp
```
