-- Tabla para suscripciones Web Push (VAPID). Solo usuarios autenticados; RLS restringe por user_id.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Solo el propio usuario puede ver sus suscripciones
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el propio usuario puede insertar (user_id debe ser auth.uid())
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo el propio usuario puede actualizar sus filas
DROP POLICY IF EXISTS "push_subscriptions_update_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_own"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Solo el propio usuario puede borrar sus filas
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE push_subscriptions IS 'Web Push subscriptions per user; RLS ensures users only access their own row. Backend (Edge Function with service role) reads all for sending push.';
