-- ============================================
-- knowledge_base_items table
-- ============================================
CREATE TABLE public.knowledge_base_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('document', 'text', 'url')),
  source_url TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on agent_id
CREATE INDEX idx_knowledge_base_items_agent_id ON public.knowledge_base_items(agent_id);

-- ============================================
-- RLS for knowledge_base_items
-- ============================================
ALTER TABLE public.knowledge_base_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view KB items of their own agents"
  ON public.knowledge_base_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_base_items.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create KB items for their own agents"
  ON public.knowledge_base_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_base_items.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update KB items of their own agents"
  ON public.knowledge_base_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_base_items.agent_id
        AND agents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_base_items.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete KB items of their own agents"
  ON public.knowledge_base_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = knowledge_base_items.agent_id
        AND agents.user_id = auth.uid()
    )
  );
