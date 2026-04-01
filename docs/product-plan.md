# AgentFlow - AI Agent Builder Platform

## Product Vision

AgentFlow is a platform that lets users create, customize, and deploy AI-powered conversational agents. Users can build personal assistants, customer service bots, and sales agents — then embed them into any website as a chat bubble with a single code snippet.

---

## Core Use Cases

| Phase | Agent Type | Description |
|-------|-----------|-------------|
| MVP | Personal Agent | A customizable AI assistant that represents you or your brand |
| MVP | Customer Service Agent | Answers questions using a knowledge base (FAQs, docs, policies) |
| Future | Sales Agent | Qualifies leads, recommends products, handles objections |

---

## Feature Breakdown

### Phase 1 - MVP

#### 1. Authentication & User Management
- Sign up / Sign in (email + password)
- OAuth providers (Google, GitHub)
- User profile management
- Supabase Auth handles all of this natively

#### 2. Agent Creation & Configuration
- Create / edit / delete agents
- Each agent has:
  - **Name** and **description**
  - **Avatar / image** (upload or URL)
  - **Personality** — system prompt that defines tone, behavior, boundaries (e.g. "You are a friendly support agent for Acme Corp. Never discuss competitors.")
  - **Knowledge base** — documents, FAQs, text snippets the agent uses as context
  - **Agent type** — personal, customer service (sales later)
  - **Model settings** — temperature, max tokens

#### 3. Knowledge Base Management
- Upload documents (PDF, TXT, MD, CSV)
- Add raw text snippets manually
- Documents are chunked, embedded (OpenAI embeddings), and stored in a vector store for retrieval (RAG)
- View, edit, delete knowledge base entries

#### 4. Agent Testing (Playground)
- Live chat interface to test your agent before deploying
- See how the agent responds with the current personality + knowledge base
- Reset conversation, tweak settings, and re-test in real time

#### 5. Embeddable Chat Widget
- Generate a code snippet (JS `<script>` tag) per agent
- Renders as a **bubble chat** in the bottom-right corner of any webpage
- Widget communicates with the AgentFlow backend API
- Customizable: primary color, position, welcome message, agent avatar
- Each snippet includes an **agent public key** (not the user's API key) so the agent is accessible without exposing credentials

#### 6. Shareable Test Link
- Generate a public URL per agent for external testing: `https://app.agentflow.dev/chat/<public_key>`
- No login required for testers — the link opens a full-page chat experience
- Optional access controls:
  - **Expiration date** — link stops working after a set date
  - **Max sessions** — limit how many people can use the link
  - **Password protection** — simple shared password for private testing
- **Feedback collection** — after the conversation, testers can:
  - Rate the agent (thumbs up/down or 1-5 stars)
  - Leave a short text comment
  - Feedback is stored and viewable in the dashboard
- Conversations from test links are tagged with `source: 'test_link'` for easy filtering
- Dashboard shows a "Test Links" section per agent with:
  - Active/expired status
  - Number of sessions and feedback summary
  - Ability to revoke or regenerate the link

#### 7. Conversation Logging
- Every message (user + agent) is stored with metadata:
  - Timestamp
  - Session ID
  - Agent ID
  - Source (playground, widget, or test_link)
  - Token usage
- Viewable in the dashboard as conversation threads
- Search and filter conversations

---

### Phase 2 - Enhancements

#### 7. Conversation Insights & Analytics
- Dashboard with metrics:
  - Total conversations, messages per day
  - Average conversation length
  - Most common topics / questions (topic clustering)
  - Sentiment analysis per conversation
  - Unanswered / low-confidence responses
- Export data as CSV

#### 8. Sales Agent Type
- Lead capture (collect name, email, phone during conversation)
- Product catalog integration (agent can reference products)
- Handoff to human (escalation trigger)
- CRM webhook integration

#### 9. Voice Chat
- Real-time voice input/output via OpenAI Realtime API or Whisper + TTS
- Push-to-talk and hands-free modes in the widget
- Voice personality settings (voice selection, speed)

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **Angular 19+** | User's chosen framework. Standalone components, signals, SSR-ready |
| UI Library | **Angular Material** or **Tailwind CSS** | Rapid, consistent UI. Tailwind preferred for widget styling isolation |
| Backend / API | **Supabase Edge Functions** (Deno) | Serverless functions co-located with the database. Handles agent chat API, embedding generation, etc. |
| Auth | **Supabase Auth** | Email/password + OAuth out of the box. Row-level security (RLS) for multi-tenant data isolation |
| Database | **Supabase PostgreSQL** | Primary data store for users, agents, conversations, messages |
| Vector Store | **Supabase pgvector** | PostgreSQL extension for storing and querying document embeddings. Keeps everything in one database |
| File Storage | **Supabase Storage** | Agent avatars, uploaded knowledge base documents |
| AI / LLM | **OpenAI API** (GPT-4o / GPT-4o-mini) | Chat completions, embeddings (text-embedding-3-small), and later TTS/STT |
| Realtime | **Supabase Realtime** | Live message streaming in the chat widget (Postgres changes → client) |
| Chat Widget | **Vanilla JS / Web Component** | The embeddable widget must be framework-agnostic so it works on any site. Built separately, bundled as a single JS file |
| Hosting | **Vercel** or **Netlify** | Angular SSR deployment. Alternatively, Supabase can host the static build |

### Additional Libraries

- `langchain` (JS/TS) — optional, for document chunking + RAG pipeline orchestration
- `pdf-parse` or `pdfjs-dist` — PDF text extraction in Edge Functions
- `marked` — render markdown in chat responses
- `uuid` — session and agent key generation

---

## Data Model (Supabase PostgreSQL)

```
users (managed by Supabase Auth)
  id                UUID  PK
  email             TEXT
  created_at        TIMESTAMPTZ

agents
  id                UUID  PK
  user_id           UUID  FK → users.id
  name              TEXT
  description       TEXT
  type              TEXT  ('personal' | 'customer_service' | 'sales')
  personality       TEXT  (system prompt)
  avatar_url        TEXT
  model             TEXT  ('gpt-4o' | 'gpt-4o-mini')
  temperature       FLOAT
  max_tokens        INT
  welcome_message   TEXT
  widget_color      TEXT
  public_key        TEXT  UNIQUE  (used in embed snippet)
  is_active         BOOLEAN
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

knowledge_base_items
  id                UUID  PK
  agent_id          UUID  FK → agents.id
  title             TEXT
  content           TEXT
  source_type       TEXT  ('document' | 'text' | 'url')
  source_url        TEXT
  file_path         TEXT  (Supabase Storage path)
  created_at        TIMESTAMPTZ

document_chunks
  id                UUID  PK
  knowledge_base_item_id  UUID  FK → knowledge_base_items.id
  agent_id          UUID  FK → agents.id
  content           TEXT
  embedding         VECTOR(1536)
  chunk_index       INT
  created_at        TIMESTAMPTZ

conversations
  id                UUID  PK
  agent_id          UUID  FK → agents.id
  session_id        TEXT
  source            TEXT  ('playground' | 'widget' | 'test_link')
  test_link_id      UUID  FK → test_links.id  (nullable)
  metadata          JSONB  (browser info, page URL, etc.)
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

test_links
  id                UUID  PK
  agent_id          UUID  FK → agents.id
  slug              TEXT  UNIQUE  (short ID used in the URL)
  password_hash     TEXT  (nullable, for password-protected links)
  max_sessions      INT  (nullable, null = unlimited)
  sessions_used     INT  DEFAULT 0
  expires_at        TIMESTAMPTZ  (nullable)
  is_active         BOOLEAN  DEFAULT true
  created_at        TIMESTAMPTZ

test_feedback
  id                UUID  PK
  conversation_id   UUID  FK → conversations.id
  test_link_id      UUID  FK → test_links.id
  rating            INT  (1-5)
  comment           TEXT
  created_at        TIMESTAMPTZ

messages
  id                UUID  PK
  conversation_id   UUID  FK → conversations.id
  role              TEXT  ('user' | 'assistant' | 'system')
  content           TEXT
  token_usage       INT
  created_at        TIMESTAMPTZ
```

---

## High-Level Architecture

```
                    +-----------------------+
                    |   Angular Dashboard   |
                    |  (Agent CRUD, Logs,   |
                    |   Playground, KB)     |
                    +----------+------------+
                               |
                               | Supabase JS Client
                               |
                    +----------v------------+
                    |      Supabase         |
                    |  +-----------------+  |
                    |  | Auth            |  |
                    |  | PostgreSQL + RLS|  |
                    |  | pgvector       |  |
                    |  | Storage        |  |
                    |  | Realtime       |  |
                    |  | Edge Functions |  |
                    |  +-----------------+  |
                    +----------+------------+
                               |
                    +----------v------------+
                    |     OpenAI API        |
                    |  (Chat, Embeddings,   |
                    |   TTS/STT later)      |
                    +-----------------------+

  Any Website
  +------------------------------------------+
  |                                          |
  |   <script src="agentflow-widget.js"      |
  |           data-agent="PUBLIC_KEY">       |
  |   </script>                              |
  |                           +----------+   |
  |                           | Chat     |   |
  |                           | Bubble   |   |
  |                           +----------+   |
  +------------------------------------------+
         |
         | REST API (Supabase Edge Function)
         v
    Agent Chat Endpoint
    → Retrieve personality + context
    → Vector search for relevant KB chunks
    → Call OpenAI with system prompt + context + history
    → Stream response back
    → Log to messages table

  Shareable Test Link
  +------------------------------------------+
  | app.agentflow.dev/chat/<slug>            |
  |                                          |
  |   Full-page chat UI (Angular route)      |
  |   No login required                      |
  |   Optional password gate                 |
  |   Feedback form after conversation       |
  +------------------------------------------+
         |
         | Same chat Edge Function endpoint
         | source = 'test_link'
         v
```

---

## Chat Flow (RAG Pipeline)

1. User sends a message via widget or playground
2. Edge Function receives the message + agent public key
3. Look up agent config (personality, model, temperature)
4. Generate embedding for the user message
5. Query `document_chunks` with cosine similarity (pgvector) to find top-K relevant chunks
6. Build the prompt:
   - System message = agent personality + relevant KB chunks as context
   - Conversation history (last N messages)
   - User message
7. Call OpenAI Chat Completion (stream)
8. Stream tokens back to the client
9. Save full message pair (user + assistant) to the database
10. Update conversation metadata

---

## Embed Widget Snippet (What the User Copies)

```html
<!-- AgentFlow Chat Widget -->
<script
  src="https://app.agentflow.dev/widget.js"
  data-agent-key="af_pk_xxxxxxxxxxxxxxxx"
  data-color="#6366f1"
  data-position="bottom-right"
  data-welcome="Hi! How can I help you today?"
  async>
</script>
```

The widget JS file:
- Injects an iframe or shadow DOM element (style isolation)
- Handles open/close toggle (bubble icon)
- Manages conversation state locally
- Communicates with the Edge Function API
- Supports streaming responses

---

## Project Structure (Angular)

```
agentflow/
  src/
    app/
      core/
        auth/              # Auth guard, auth service, login/register pages
        services/          # Supabase client, OpenAI proxy, etc.
        interceptors/      # HTTP interceptors (auth token)
        models/            # TypeScript interfaces (Agent, Conversation, etc.)
      features/
        dashboard/         # Overview, stats
        agents/
          agent-list/      # List all agents
          agent-editor/    # Create/edit agent (personality, KB, settings)
          agent-detail/    # View single agent, embed code
        knowledge-base/    # Upload docs, manage text entries
        playground/        # Test chat with an agent
        test-links/        # Manage shareable test links per agent
        public-chat/       # Public-facing chat page (no auth, used by test links)
        conversations/     # View logged conversations
          conversation-list/
          conversation-detail/
      shared/
        components/        # Reusable components (chat-message, file-upload, etc.)
        pipes/
        directives/
    environments/          # Supabase URL, anon key, OpenAI config

  widget/                  # Separate build target
    src/
      widget.ts            # Entry point, renders chat bubble
      chat.ts              # Chat logic, API calls
      styles.css           # Widget styles (injected into shadow DOM)

  supabase/
    functions/
      chat/                # Edge function: handle chat messages
      embed/               # Edge function: generate embeddings on KB upload
    migrations/            # SQL migrations for tables, indexes, pgvector
    seed.sql               # Optional seed data

  docs/
    product-plan.md        # This file
```

---

## Implementation Roadmap

### Sprint 1 — Foundation (Week 1-2)
- [ ] Initialize Angular project with standalone components
- [ ] Set up Supabase project (Auth, DB, Storage, Edge Functions)
- [ ] Create database schema + migrations + RLS policies
- [ ] Implement authentication (sign up, sign in, OAuth)
- [ ] Basic dashboard layout and routing

### Sprint 2 — Agent Builder (Week 3-4)
- [ ] Agent CRUD (create, list, edit, delete)
- [ ] Personality editor (system prompt with preview)
- [ ] Avatar upload (Supabase Storage)
- [ ] Agent settings (model, temperature, max tokens)
- [ ] Public key generation for embed

### Sprint 3 — Knowledge Base + RAG (Week 5-6)
- [ ] Knowledge base UI (upload documents, add text snippets)
- [ ] Edge Function: document processing pipeline (extract text, chunk, embed, store)
- [ ] Enable pgvector extension, create HNSW index
- [ ] RAG retrieval in chat Edge Function

### Sprint 4 — Chat, Playground & Test Links (Week 7-8)
- [ ] Chat Edge Function (streaming responses)
- [ ] Playground UI (test agent in dashboard)
- [ ] Shareable test link generation (slug, expiration, password, max sessions)
- [ ] Public chat page (Angular route, no auth required)
- [ ] Feedback form (rating + comment) shown after test conversations
- [ ] Test link management UI in dashboard (create, revoke, view feedback)
- [ ] Conversation history management
- [ ] Message logging to database (with source tracking: playground, widget, test_link)

### Sprint 5 — Embeddable Widget (Week 9-10)
- [ ] Build chat widget as standalone JS bundle (Web Component)
- [ ] Widget ↔ Edge Function API integration
- [ ] Widget customization (color, position, welcome message)
- [ ] Embed code generator in dashboard
- [ ] Cross-origin and security considerations (CORS, rate limiting)

### Sprint 6 — Conversations & Polish (Week 11-12)
- [ ] Conversation list and detail views in dashboard
- [ ] Search and filter conversations
- [ ] Token usage tracking
- [ ] Error handling, loading states, edge cases
- [ ] Responsive design pass

### Future Sprints
- [ ] Analytics dashboard (insights, topic clustering, sentiment)
- [ ] Sales agent features (lead capture, product catalog)
- [ ] Voice chat (Whisper + TTS or Realtime API)
- [ ] Multi-language support
- [ ] Agent collaboration / handoff to human
- [ ] Pricing / subscription management (Stripe)

---

## Open Questions & Considerations

1. **Rate limiting** — The widget is public-facing. We need rate limiting per session/IP on the chat Edge Function to prevent abuse. Consider Supabase's built-in rate limiting or an upstream solution (Cloudflare).

2. **Streaming** — Supabase Edge Functions support streaming responses via `ReadableStream`. The widget should handle SSE or chunked transfer for real-time token delivery.

3. **Cost control** — Each chat message costs OpenAI tokens. Consider:
   - Per-agent monthly token budget
   - Fallback to a cheaper model (GPT-4o-mini) when budget is low
   - Usage dashboard so users can monitor costs

4. **Widget security** — The public key in the embed snippet is visible to anyone. It should only grant access to the chat endpoint for that specific agent. Never expose the user's Supabase credentials or OpenAI key.

5. **Knowledge base size limits** — Large document uploads need chunking. Define max file size (e.g., 10MB) and max chunks per agent for the MVP.

6. **Conversation context window** — As conversations grow, we can't send the entire history to OpenAI. Implement a sliding window (last N messages) or summarization strategy.

7. **Multi-tenancy** — Supabase RLS policies must ensure users can only access their own agents, conversations, and knowledge base entries. This is critical.

8. **Widget performance** — The widget JS bundle should be small (<50KB gzipped). Use no frameworks — vanilla JS or a minimal Web Component. Lazy-load the full chat UI on bubble click.
