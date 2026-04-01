-- ============================================
-- agents table
-- ============================================
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'personal'
    CHECK (type IN ('personal', 'customer_service', 'sales')),
  personality TEXT,
  avatar_url TEXT,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini'
    CHECK (model IN ('gpt-4o', 'gpt-4o-mini')),
  temperature FLOAT NOT NULL DEFAULT 0.7
    CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INT NOT NULL DEFAULT 1024
    CHECK (max_tokens >= 256 AND max_tokens <= 4096),
  welcome_message TEXT,
  widget_color TEXT NOT NULL DEFAULT '#6366f1',
  public_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on user_id for fast lookups
CREATE INDEX idx_agents_user_id ON public.agents(user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS for agents
-- ============================================
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agents"
  ON public.agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
  ON public.agents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
  ON public.agents FOR DELETE
  USING (auth.uid() = user_id);
