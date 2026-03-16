-- Función temporal para debug del schema
CREATE OR REPLACE FUNCTION get_pedidos_columns()
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT column_name::text, data_type::text, is_nullable::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'pedidos'
  ORDER BY ordinal_position;
$$;

-- Dar permiso a anon y authenticated
GRANT EXECUTE ON FUNCTION get_pedidos_columns() TO anon, authenticated;
