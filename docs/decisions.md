# AgentFlow — Architectural & Technical Decisions

This document logs key decisions made during development, the reasoning behind them, and any alternatives considered.

---

## Issue #1 — Project Scaffolding

### D1: Angular 21 (not 19 as originally planned)

- **Context**: Angular CLI generated Angular 21 (latest stable at time of init), not v19 as the product plan mentioned.
- **Decision**: Proceed with Angular 21.
- **Rationale**: Latest version uses standalone components by default, has improved signals API, and better DX. No reason to downgrade.
- **Impact**: All components use standalone pattern. No `NgModule` files.

### D2: Tailwind CSS v4 with `@use` syntax

- **Context**: Tailwind v4 changed the import syntax. Using `@import "tailwindcss"` in SCSS triggers Sass deprecation warnings.
- **Decision**: Use `@use "tailwindcss"` in `src/styles.scss`.
- **Rationale**: Avoids deprecation warnings while keeping SCSS as the stylesheet preprocessor.
- **File**: `src/styles.scss`

### D3: PostCSS config via `.postcssrc.json`

- **Context**: Tailwind v4 requires PostCSS integration.
- **Decision**: Use `.postcssrc.json` with `@tailwindcss/postcss` plugin.
- **Rationale**: Cleaner than embedding PostCSS config in `angular.json`.

---

## Issue #2 — Supabase Setup

### D4: Google & GitHub OAuth providers

- **Context**: Product plan calls for social login.
- **Decision**: Configure both Google and GitHub OAuth in `supabase/config.toml`. Keys are placeholders that need real values for production.
- **Rationale**: Two most common OAuth providers for developer-facing SaaS products.

### D5: Two storage buckets — `avatars` and `documents`

- **Context**: Agents need avatar images; knowledge base needs document storage.
- **Decision**: Separate buckets for avatars (public) and documents (private with RLS).
- **Rationale**: Different access patterns — avatars are public, documents are private per user.

### D6: Edge Function placeholders with `Deno.serve()`

- **Context**: Supabase Edge Functions run on Deno runtime.
- **Decision**: Use `Deno.serve()` pattern with `// @ts-nocheck` at the top of each edge function file.
- **Rationale**: `@ts-nocheck` suppresses local LSP/TypeScript errors since the Deno types aren't available in the local dev environment. These functions compile correctly when deployed to Supabase.

---

## Issue #3 — Database Schema

### D7: pgvector extension for embeddings

- **Context**: Knowledge base documents need vector similarity search for RAG.
- **Decision**: Enable `pgvector` extension and use `vector(1536)` column type on `document_chunks` table.
- **Rationale**: OpenAI `text-embedding-ada-002` produces 1536-dimension vectors. pgvector is natively supported by Supabase.

### D8: HNSW index for vector search

- **Context**: Need efficient approximate nearest neighbor search.
- **Decision**: Use HNSW index (`ivfflat` alternative considered).
- **Rationale**: HNSW provides better recall and doesn't require training on existing data.

### D9: `match_documents` database function

- **Context**: RAG retrieval needs to find relevant document chunks.
- **Decision**: Create a Postgres function `match_documents(query_embedding, match_threshold, match_count, agent_id)` that returns ranked chunks.
- **Rationale**: Keeps vector search logic in the database layer for performance.

### D10: RLS policies — service role for public features

- **Context**: Widget and test links need to access agent data without user authentication.
- **Decision**: Edge Functions use the Supabase **service role key** (bypasses RLS) for public-facing features. No public SELECT policy on `agents` table.
- **Rationale**: More secure — only server-side Edge Functions can read agent data for public use, preventing direct client-side access to agent configurations.

---

## Issue #4 — Authentication

### D11: AuthService uses Angular signals

- **Context**: Need reactive auth state across the app.
- **Decision**: Use Angular `signal()` for `user` and `session` state in `AuthService`. Expose as `readonly` signals.
- **Rationale**: Signals are Angular 21's recommended reactive primitive. Lighter than RxJS for simple state.

### D12: Functional `canActivate` guard

- **Context**: Need to protect authenticated routes.
- **Decision**: Use a functional guard (`authGuard`) with `inject(AuthService)` instead of a class-based guard.
- **Rationale**: Angular 21 favors functional guards. Less boilerplate than class-based.

---

## Issue #5 — Shell & Routing

### D13: Lazy-loaded routes for all feature modules

- **Context**: App has many feature areas (agents, dashboard, knowledge base, playground, etc.).
- **Decision**: Every feature route uses `loadComponent` for lazy loading.
- **Rationale**: Keeps initial bundle small. Each feature loads on demand.
- **Note**: LSP sometimes shows false errors for lazy-loaded imports (e.g., `Cannot find module './features/agents/agent-list/agent-list'`) but `ng build` compiles successfully. These can be safely ignored.

### D14: Mobile-responsive sidebar with hamburger menu

- **Context**: Need responsive layout for the admin shell.
- **Decision**: Sidebar collapses on mobile with a hamburger toggle in the header.
- **Rationale**: Standard SaaS admin pattern. Good mobile UX without a separate mobile layout.

---

## Issue #6 — Agent Models & Service

### D15: Separate request types for create/update

- **Context**: Agent creation and updates have different required fields.
- **Decision**: Define `CreateAgentRequest` (required fields only) and `UpdateAgentRequest` (all fields optional via `Partial`) as separate interfaces alongside the main `Agent` interface.
- **Rationale**: Type safety — prevents accidentally sending incomplete data. Clear API contract.

### D16: `AgentType` as a string union type

- **Context**: Agents have different types (personal_assistant, customer_service, sales).
- **Decision**: Use `type AgentType = 'personal_assistant' | 'customer_service' | 'sales'` instead of an enum.
- **Rationale**: String unions are more idiomatic in modern TypeScript, produce cleaner JS output, and match the database `agent_type` enum.

---

## Issue #7 — Agent List (in progress)

### D17: Separate `.ts` and `.html` files for complex components

- **Context**: `AgentListComponent` has substantial template logic (search, filters, cards grid, empty states).
- **Decision**: Use `templateUrl: './agent-list.html'` instead of inline template.
- **Rationale**: Better readability and IDE support for larger templates. Inline templates are fine for small components.

---

## General / Cross-Cutting

### D18: Widget as vanilla JS Web Component

- **Context**: The chat widget needs to be embeddable on any website.
- **Decision**: Build the widget as a standalone vanilla JS Web Component, NOT as an Angular component.
- **Rationale**: No framework dependency for end users. Smallest possible bundle. Works with any website regardless of their tech stack.

### D19: Shareable test links architecture

- **Context**: Users need to share agent test links for feedback before going live.
- **Decision**: Test links at `/chat/:slug` allow anyone to test an agent without login. Support optional password protection, expiration dates, and session limits. Include feedback collection.
- **Rationale**: Enables QA and stakeholder review without requiring accounts.

### D20: No `NgModule` files anywhere

- **Context**: Angular 21 defaults to standalone components.
- **Decision**: Entire project uses standalone components exclusively. No `NgModule` files.
- **Rationale**: Angular 21 best practice. Simpler dependency management. Better tree-shaking.

---

## Issue #8 — Agent Editor

### D21: Reactive Forms for Agent Editor

- **Context**: Agent editor has complex form with validation, conditional behavior (create vs edit mode), and multiple field types.
- **Decision**: Use Angular Reactive Forms (`FormBuilder`, `FormGroup`, `Validators`) instead of template-driven forms.
- **Rationale**: Better control over validation logic, easier programmatic manipulation (e.g., `patchValue` for edit mode), and type-safer than ngModel for complex forms.

### D22: Sectioned form layout with card groups

- **Context**: Agent editor has ~9 form fields spanning different concerns (basic info, personality, model settings, widget appearance).
- **Decision**: Group fields into 4 visual card sections: Basic Information, Personality & Behavior, Model Settings, Widget Appearance.
- **Rationale**: Reduces cognitive load. Users can focus on one concern at a time. Matches common SaaS settings page patterns.

### D23: Temperature as native range slider (not custom component)

- **Context**: Temperature is a 0-2 float value.
- **Decision**: Use a native `<input type="range">` with `accent-indigo-600` styling and manual `(input)` handler to sync with the reactive form.
- **Rationale**: Native range input is accessible and works cross-browser. No need for a custom slider component at this stage. The form control is synced manually because Angular's `formControlName` doesn't bind well to range inputs with step values.

### D24: Dual create/edit mode via route parameter detection

- **Context**: The same component serves both `/agents/new` (create) and `/agents/:id/edit` (edit).
- **Decision**: Check `ActivatedRoute.snapshot.paramMap.get('id')` in `ngOnInit`. If an ID exists, switch to edit mode and load the agent with `patchValue`. If not, stay in create mode with defaults.
- **Rationale**: Single component for both modes reduces duplication. Route-based mode detection is standard Angular pattern.

---

## Issue #9 — Avatar Upload

### D25: Separate `StorageService` for file operations

- **Context**: Avatar upload needs file validation, Supabase Storage interaction, and URL extraction.
- **Decision**: Create a dedicated `StorageService` (`src/app/core/services/storage.service.ts`) rather than adding methods to `SupabaseService`.
- **Rationale**: Keeps `SupabaseService` as a thin client wrapper. Storage logic (validation, path construction, cleanup) is domain-specific and warrants its own service. Can be extended for document uploads later (knowledge base).

### D26: Client-side file validation before upload

- **Context**: Need to enforce 2MB limit and image-only types.
- **Decision**: Validate file type and size on the client before calling Supabase Storage. Show error immediately without network request.
- **Rationale**: Better UX — instant feedback. Reduces unnecessary API calls. Server-side bucket policies provide the second layer of defense.

### D27: Avatar upload deferred to form save (not immediate)

- **Context**: Should avatar upload happen when the user selects a file or when they save the form?
- **Decision**: Show a local preview via `FileReader.readAsDataURL()` immediately, but defer the actual upload to Supabase Storage until the user clicks Save.
- **Rationale**: Avoids orphaned uploads if the user cancels. For new agents, the agent ID doesn't exist yet until `createAgent` completes, so upload must happen after creation anyway.

### D28: Clean up old avatars before uploading new ones

- **Context**: When a user changes their avatar, the old file remains in storage.
- **Decision**: `StorageService.uploadAvatar()` lists and removes all existing files in `{userId}/{agentId}/` before uploading the new one.
- **Rationale**: Prevents storage bloat from orphaned files. Each agent should only have one avatar at a time.

---

## Issue #10 — Agent Detail Page

### D29: Personality truncation at 200 characters with toggle

- **Context**: System prompts can be very long. Displaying the full text by default clutters the detail page.
- **Decision**: Show first 200 characters with a "Show more" / "Show less" toggle button.
- **Rationale**: Keeps the page scannable while still allowing full text inspection when needed.

### D30: Embed code uses Supabase Functions URL pattern

- **Context**: The widget script URL needs to point to the deployed widget JS.
- **Decision**: Construct the embed code URL from `environment.supabaseUrl` by replacing `.supabase.co` with `.functions.supabase.co/widget/agentflow-widget.js`. Include `data-agent-key`, `data-color`, and optionally `data-welcome` attributes.
- **Rationale**: Follows Supabase Edge Functions URL convention. The widget itself will be built and deployed as a separate static asset in a later issue.

### D31: Copy-to-clipboard via `navigator.clipboard` API

- **Context**: Need copy buttons for public key and embed code snippet.
- **Decision**: Use `navigator.clipboard.writeText()` with a temporary "Copied" state (2-second timeout) for visual feedback.
- **Rationale**: Modern API, supported in all target browsers. No third-party clipboard library needed.

### D32: Delete confirmation as a modal overlay (not inline)

- **Context**: Agent deletion is destructive and irreversible.
- **Decision**: Show a centered modal with backdrop (`fixed inset-0 z-50 bg-black/50`) explaining the consequences, with Cancel and Delete buttons.
- **Rationale**: Modal is more prominent than an inline confirmation (used for lighter actions like card delete in the list). The gravity of deleting an agent with all its conversations/documents warrants a modal.

### D33: Active/inactive toggle as a clickable badge (not a switch)

- **Context**: Need a way to activate/deactivate an agent from the detail page.
- **Decision**: The status indicator next to the agent name is clickable. Clicking it calls `updateAgent({ is_active: !current })` and updates the display.
- **Rationale**: Inline toggle is faster than navigating to edit mode. The animated ping effect on the active dot provides clear visual differentiation.

---

## Issue #11 — Knowledge Base UI

### D34: KnowledgeBaseService triggers embedding fire-and-forget

- **Context**: After creating a text snippet or uploading a document, embeddings need to be generated via the embed Edge Function.
- **Decision**: `KnowledgeBaseService.createTextItem()` and `uploadDocument()` call `triggerEmbedding()` as a fire-and-forget operation (`.catch(() => {})`) after the DB insert succeeds.
- **Rationale**: The user shouldn't wait for embedding generation (which involves OpenAI API calls and can take seconds). The KB item appears in the list immediately. Embedding failures don't block the UI.

### D35: Document file validation on client side (10MB, specific extensions)

- **Context**: Documents have different size/type limits than avatars.
- **Decision**: `KnowledgeBaseService.validateDocument()` checks for `.pdf/.txt/.md/.csv` extensions and 10MB max size. Validation runs before upload.
- **Rationale**: Same client-first validation pattern as avatar upload (D26). Server-side bucket policies provide backup enforcement.

### D36: Document title derived from filename

- **Context**: When uploading a document, the user doesn't enter a title separately.
- **Decision**: Auto-generate the title from the filename with the extension stripped (`file.name.replace(/\.[^/.]+$/, '')`).
- **Rationale**: Reduces friction — users can always edit later. The filename is usually descriptive enough.

---

## Issue #12 — Embed Edge Function

### D37: Simple token estimation (~4 chars per token)

- **Context**: Text chunking needs to split at ~500 token boundaries, but exact tokenization (tiktoken) isn't readily available in Deno.
- **Decision**: Use a simple heuristic: `Math.ceil(text.length / 4)` to estimate token count.
- **Rationale**: For English text, the ~4 chars/token ratio is a reasonable approximation. Exact tokenization would require importing a tokenizer library. The overlap ensures no content is lost at boundaries.

### D38: Chunking at paragraph/sentence boundaries with overlap

- **Context**: Naive fixed-size splits break mid-sentence, reducing retrieval quality.
- **Decision**: Split text by paragraphs first, then by sentences. Accumulate until ~500 tokens, then start a new chunk with ~50 tokens of overlap from the previous chunk.
- **Rationale**: Sentence-aware splitting produces more coherent chunks. Overlap ensures context isn't lost at chunk boundaries, improving retrieval accuracy.

### D39: PDF text extraction is basic (fallback to `.text()`)

- **Context**: `pdf-parse` is a Node.js library not available in Deno runtime.
- **Decision**: For PDF files, attempt `fileData.text()` which works for text-based PDFs. If extraction fails, return a 400 error suggesting conversion to TXT.
- **Rationale**: A pragmatic approach for the MVP. In production, consider using a dedicated PDF extraction API or service. Most simple PDFs (not scanned images) will work with basic text extraction.

### D40: Embedding batching with OpenAI (max 100 per request)

- **Context**: A large document might produce hundreds of chunks that all need embeddings.
- **Decision**: Batch embedding API calls in groups of 100 (OpenAI's max batch size for embeddings). Insert DB records in batches of 50.
- **Rationale**: Respects API limits. Batching is much faster than one-by-one calls. DB batch inserts avoid payload size issues.

### D41: Re-processing support (delete existing chunks first)

- **Context**: If a document is re-processed (e.g., content updated), old chunks should be replaced.
- **Decision**: Before inserting new chunks, delete all existing `document_chunks` for the given `knowledge_base_item_id`.
- **Rationale**: Prevents duplicate chunks. Allows re-triggering embedding for updated content.

---

## Issue #13 — RAG Retrieval

### D42: `match_documents` function already existed (migration #10)

- **Context**: Issue #13 asks for the `match_documents` Postgres function, but it was already created in Issue #3.
- **Decision**: No new migration needed. The existing function matches the spec exactly (query_embedding, match_agent_id, match_count, match_threshold, returns id/content/similarity).
- **Rationale**: Avoid duplicate migrations. Verified the existing function satisfies all acceptance criteria.

### D43: Shared `_shared/retrieval.ts` module for Edge Functions

- **Context**: RAG retrieval logic (embed query, call match_documents, format context) is needed by the chat function but should be reusable.
- **Decision**: Create `supabase/functions/_shared/retrieval.ts` with `embedText()`, `retrieveContext()`, and `formatContextForPrompt()`. The `_shared` directory prefix tells Supabase not to deploy it as a standalone function.
- **Rationale**: Supabase convention — directories prefixed with `_` are shared modules, not deployed as functions. Keeps retrieval logic DRY across functions.

### D44: Graceful degradation when RAG returns no results

- **Context**: If an agent has no knowledge base or the query doesn't match any chunks, the chat should still work.
- **Decision**: `retrieveContext()` returns an empty array on RPC errors instead of throwing. `formatContextForPrompt()` returns an empty string when no chunks match. The chat function will work with just the system prompt.
- **Rationale**: RAG is an enhancement, not a requirement. Agents without knowledge bases should function normally as plain conversational agents.
