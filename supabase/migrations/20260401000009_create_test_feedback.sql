-- ============================================
-- test_feedback table
-- ============================================
CREATE TABLE public.test_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  test_link_id UUID NOT NULL REFERENCES public.test_links(id) ON DELETE CASCADE,
  rating INT NOT NULL
    CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on test_link_id for aggregating feedback per link
CREATE INDEX idx_test_feedback_test_link_id ON public.test_feedback(test_link_id);

-- Index on conversation_id
CREATE INDEX idx_test_feedback_conversation_id ON public.test_feedback(conversation_id);

-- ============================================
-- RLS for test_feedback
-- ============================================
ALTER TABLE public.test_feedback ENABLE ROW LEVEL SECURITY;

-- Public INSERT: anyone with a valid test link can submit feedback
-- (actual validation happens in the Edge Function, RLS just allows the insert)
CREATE POLICY "Anyone can submit test feedback"
  ON public.test_feedback FOR INSERT
  WITH CHECK (true);

-- Only agent owners can read feedback
CREATE POLICY "Users can view feedback for their own agents"
  ON public.test_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_links
      JOIN public.agents ON agents.id = test_links.agent_id
      WHERE test_links.id = test_feedback.test_link_id
        AND agents.user_id = auth.uid()
    )
  );

-- Only agent owners can delete feedback
CREATE POLICY "Users can delete feedback for their own agents"
  ON public.test_feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_links
      JOIN public.agents ON agents.id = test_links.agent_id
      WHERE test_links.id = test_feedback.test_link_id
        AND agents.user_id = auth.uid()
    )
  );
