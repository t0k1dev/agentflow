-- ============================================
-- conversations table
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL
    CHECK (source IN ('playground', 'widget', 'test_link')),
  test_link_id UUID REFERENCES public.test_links(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on agent_id
CREATE INDEX idx_conversations_agent_id ON public.conversations(agent_id);

-- Index on session_id + agent_id for finding existing conversations
CREATE INDEX idx_conversations_session_agent ON public.conversations(session_id, agent_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS for conversations
-- ============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations of their own agents"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = conversations.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations for their own agents"
  ON public.conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = conversations.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations of their own agents"
  ON public.conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = conversations.agent_id
        AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = conversations.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete conversations of their own agents"
  ON public.conversations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = conversations.agent_id
        AND agents.user_id = auth.uid()
    )
  );
