-- ============================================
-- test_links table
-- ============================================
CREATE TABLE public.test_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  max_sessions INT,
  sessions_used INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on agent_id
CREATE INDEX idx_test_links_agent_id ON public.test_links(agent_id);

-- ============================================
-- RLS for test_links
-- ============================================
ALTER TABLE public.test_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view test links of their own agents"
  ON public.test_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = test_links.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create test links for their own agents"
  ON public.test_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = test_links.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update test links of their own agents"
  ON public.test_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = test_links.agent_id
        AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = test_links.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete test links of their own agents"
  ON public.test_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = test_links.agent_id
        AND agents.user_id = auth.uid()
    )
  );
