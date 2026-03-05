-- Permitir múltiples dispositivos por usuario en push_subscriptions

ALTER TABLE push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_endpoint_key
  UNIQUE (user_id, endpoint);

