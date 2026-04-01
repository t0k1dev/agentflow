-- ============================================
-- document_chunks table (for RAG / vector search)
-- ============================================
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_item_id UUID NOT NULL REFERENCES public.knowledge_base_items(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  chunk_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on agent_id for filtering
CREATE INDEX idx_document_chunks_agent_id ON public.document_chunks(agent_id);

-- Index on knowledge_base_item_id
CREATE INDEX idx_document_chunks_kb_item_id ON public.document_chunks(knowledge_base_item_id);

-- HNSW index for fast vector similarity search
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================
-- RLS for document_chunks
-- ============================================
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their own agents"
  ON public.document_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = document_chunks.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chunks for their own agents"
  ON public.document_chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = document_chunks.agent_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks of their own agents"
  ON public.document_chunks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents
      WHERE agents.id = document_chunks.agent_id
        AND agents.user_id = auth.uid()
    )
  );
