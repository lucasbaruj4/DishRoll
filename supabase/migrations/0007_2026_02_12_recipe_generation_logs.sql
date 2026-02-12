-- Recipe generation usage logs for rate limiting and observability
CREATE TABLE IF NOT EXISTS recipe_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited')),
  provider TEXT NOT NULL DEFAULT 'openai',
  ingredient_count INTEGER NOT NULL CHECK (ingredient_count >= 0),
  error_code TEXT,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipe_generation_logs_user_requested_idx
  ON recipe_generation_logs (user_id, requested_at DESC);

ALTER TABLE recipe_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own generation logs"
  ON recipe_generation_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
