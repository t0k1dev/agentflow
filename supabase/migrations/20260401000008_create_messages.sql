-- ============================================
-- messages table
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_usage INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on conversation_id for fast message retrieval
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- Composite index for fetching messages in order
CREATE INDEX idx_messages_conversation_created ON public.messages(conversation_id, created_at);

-- ============================================
-- RLS for messages
-- ============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.agents ON agents.id = conversations.agent_id
      WHERE conversations.id = messages.conversation_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.agents ON agents.id = conversations.agent_id
      WHERE conversations.id = messages.conversation_id
        AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their own conversations"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.agents ON agents.id = conversations.agent_id
      WHERE conversations.id = messages.conversation_id
        AND agents.user_id = auth.uid()
    )
  );
