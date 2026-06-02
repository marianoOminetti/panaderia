-- Bootstrap: usuarios existentes en Auth reciben rol admin si no tenían fila.
-- Idempotente (ON CONFLICT DO NOTHING).

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
