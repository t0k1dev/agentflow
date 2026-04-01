# AgentFlow — Project Memory

## Goal

Build **AgentFlow** — a platform for creating, customizing, and deploying AI-powered conversational agents (personal assistants, customer service bots, and later sales agents). Users can embed agents on websites as bubble chat widgets, share test links for feedback, and view conversation logs/insights.

## Tech Stack

- **Frontend**: Angular 21, Tailwind CSS v4, standalone components, signals
- **Backend**: Supabase (auth, DB, storage, edge functions)
- **AI**: OpenAI (LLM, embeddings)
- **Widget**: Standalone vanilla JS Web Component (not Angular) for embedding on any site

## GitHub

- **Repo**: `https://github.com/t0k1dev/agentflow`
- **28 issues** organized by sprint with labels
- Each issue has detailed acceptance criteria written for an agent to implement independently
- Implementation is done issue-by-issue, sequentially

## Progress

### Completed & Pushed (Issues #1-3, commit `fb3a01c`)

- **Issue #1**: Angular 21 project, Tailwind CSS v4, environment files, folder structure
- **Issue #2**: Supabase CLI init, Google/GitHub OAuth in config, storage buckets (avatars/documents), Edge Function placeholders, `SupabaseService`
- **Issue #3**: 10 SQL migrations — pgvector, 7 tables, HNSW index, RLS policies, `updated_at` triggers, `match_documents` function

### Completed & Pushed (Issues #4-8, commit `cae1753`)

- **Issue #4**: `AuthService` (signUp, signIn, signInWithOAuth, signOut, getSession, user signal), `authGuard`, `LoginComponent`, `RegisterComponent`
- **Issue #5**: `ShellComponent` (sidebar + header + router-outlet), all routes configured with lazy loading, placeholder components for all pages, mobile-responsive sidebar with hamburger
- **Issue #6**: `Agent` interface, `AgentType`, `CreateAgentRequest`, `UpdateAgentRequest` models, `AgentService` with all 7 CRUD methods
- **Issue #7**: `AgentListComponent` — responsive card grid with loading skeletons, empty state, delete confirmation overlay, type badges, active/inactive indicators
- **Issue #8**: `AgentEditorComponent` — full Reactive Forms implementation with create/edit modes, validation, personality character count, temperature slider, color picker, all form sections

### Completed & Pushed (Issues #9-10, commit `15bb93c`)

- **Issue #9**: `StorageService` for avatar upload/delete, avatar upload section in AgentEditorComponent with preview, validation, remove functionality
- **Issue #10**: Full `AgentDetailComponent` — agent info header with active toggle, quick links grid, personality with show more/less, model settings, public key with copy/regenerate, embed code snippet with copy, delete confirmation modal, 404 state

### Completed & Pushed (Issues #11-13, commit `e6f2867`)

- **Issue #11**: `KnowledgeBaseItem` model, `KnowledgeBaseService` (getItems, getItem, createTextItem, uploadDocument, deleteItem, triggerEmbedding), full KB management UI with list, add text modal, upload document, delete confirmation
- **Issue #12**: Full embed Edge Function — text extraction, chunking (~500 tokens with ~50 overlap), OpenAI `text-embedding-3-small` batch embeddings, chunk storage in `document_chunks` with re-processing support
- **Issue #13**: `match_documents` Postgres function already existed (migration #10). Created shared `_shared/retrieval.ts` module with `embedText()`, `retrieveContext()`, and `formatContextForPrompt()` for RAG. Updated chat function placeholder to import retrieval.

### Completed & Pushed (Issues #14-16)

- **Issue #14**: Full chat Edge Function — validates agent by public_key, creates/reuses conversations by session_id, saves user/assistant messages, RAG retrieval with context injection, OpenAI streaming (SSE), conversation history (last 20 messages), rate limiting (20/min/session), CORS, error handling
- **Issue #15**: Full Playground UI — agent info panel, live chat with SSE streaming, markdown rendering (marked lib), typing indicator, welcome message, reset conversation, responsive layout, no-personality warning
- **Issue #16**: Test link model/service/UI — create with optional expiration/max sessions/password (SHA-256 hashed), URL-safe random slug generation, copy-to-clipboard, status badges (active/expired/limit reached/revoked), revoke/delete with confirmation

### Not Started

- Issues #17-28 remain open on GitHub

## Relevant Files & Directories

### Config & Project Root

| File | Purpose |
|------|---------|
| `angular.json` | Angular project config |
| `package.json` | Deps: `@supabase/supabase-js`, `tailwindcss`, `@tailwindcss/postcss` |
| `.postcssrc.json` | Tailwind PostCSS config |
| `tsconfig.json`, `tsconfig.app.json` | TypeScript config |
| `src/styles.scss` | Tailwind import (`@use "tailwindcss"`) |
| `src/environments/environment.ts` | Supabase URL/key placeholders |
| `src/environments/environment.prod.ts` | Production env |

### Supabase

| File | Purpose |
|------|---------|
| `supabase/config.toml` | Auth providers (Google, GitHub), storage buckets |
| `supabase/migrations/` | 10 migration files (20260401000001-10) |
| `supabase/functions/chat/index.ts` | Chat edge function — full streaming implementation with RAG, conversation logging, rate limiting |
| `supabase/functions/embed/index.ts` | Document embedding pipeline (chunk, embed, store) |
| `supabase/functions/_shared/retrieval.ts` | RAG retrieval helper (embedText, retrieveContext, formatContextForPrompt) |
| `supabase/seed.sql` | Seed data |

### Core (Auth & Services)

| File | Purpose |
|------|---------|
| `src/app/core/auth/auth.service.ts` | AuthService with signals |
| `src/app/core/auth/auth.guard.ts` | Functional canActivate guard |
| `src/app/core/auth/login/login.ts` + `login.html` | Login page |
| `src/app/core/auth/register/register.ts` + `register.html` | Register page |
| `src/app/core/services/supabase.service.ts` | Supabase client wrapper |
| `src/app/core/services/agent.service.ts` | Full CRUD for agents |
| `src/app/core/services/storage.service.ts` | Avatar upload/delete to Supabase Storage |
| `src/app/core/services/knowledge-base.service.ts` | KB CRUD + document upload + embedding trigger |
| `src/app/core/services/chat.service.ts` | SSE streaming client for chat Edge Function |
| `src/app/core/services/test-link.service.ts` | Test link CRUD, slug generation, password hashing, validation |
| `src/app/core/models/agent.model.ts` | Agent, AgentType, CreateAgentRequest, UpdateAgentRequest |
| `src/app/core/models/knowledge-base.model.ts` | KnowledgeBaseItem, KBSourceType, CreateTextItemRequest |
| `src/app/core/models/test-link.model.ts` | TestLink, TestLinkStatus, status helpers |

### App Shell & Routing

| File | Purpose |
|------|---------|
| `src/app/app.ts` | Root component (`<router-outlet>`) |
| `src/app/app.routes.ts` | All routes with lazy loading and authGuard |
| `src/app/shared/components/shell/shell.ts` + `shell.html` | Sidebar + header + router-outlet |

### Feature Components

| File | Status |
|------|--------|
| `src/app/features/agents/agent-list/agent-list.ts` + `agent-list.html` | Complete — card grid, skeletons, empty state, delete |
| `src/app/features/agents/agent-editor/agent-editor.ts` + `agent-editor.html` | Complete — Reactive Forms, create/edit modes, validation, avatar upload |
| `src/app/features/agents/agent-detail/agent-detail.ts` + `agent-detail.html` | Complete — full detail page, embed code, public key, active toggle, delete |
| `src/app/features/dashboard/dashboard.ts` | Placeholder |
| `src/app/features/knowledge-base/knowledge-base.ts` + `knowledge-base.html` | Complete — KB list, add text modal, upload document, delete |
| `src/app/features/playground/playground.ts` + `playground.html` | Complete — live chat, SSE streaming, markdown, typing indicator, reset |
| `src/app/features/test-links/test-links.ts` + `test-links.html` | Complete — create/revoke/delete test links, status badges, copy URL |
| `src/app/features/public-chat/public-chat.ts` | Placeholder |
| `src/app/features/conversations/conversation-list/conversation-list.ts` | Placeholder |
| `src/app/features/conversations/conversation-detail/conversation-detail.ts` | Placeholder |

### Docs

| File | Purpose |
|------|---------|
| `docs/product-plan.md` | Full product spec — source of truth |
| `docs/memory.md` | This file — project context & progress |
| `docs/decisions.md` | Architectural & technical decisions log |
