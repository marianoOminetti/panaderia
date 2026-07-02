-- Promos exclusivas para determinados clientes.
-- alcance: 'todos' (default, comportamiento actual) | 'clientes' (solo clientes asignados).

ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS alcance text NOT NULL DEFAULT 'todos';

ALTER TABLE promociones
  DROP CONSTRAINT IF EXISTS promociones_alcance_check;
ALTER TABLE promociones
  ADD CONSTRAINT promociones_alcance_check CHECK (alcance IN ('todos', 'clientes'));

-- Clientes habilitados para una promo exclusiva (whitelist).
CREATE TABLE IF NOT EXISTS promocion_clientes (
  promocion_id uuid NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  PRIMARY KEY (promocion_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_promocion_clientes_cliente ON promocion_clientes(cliente_id);

ALTER TABLE promocion_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_required_promocion_clientes" ON promocion_clientes;
DROP POLICY IF EXISTS "admin_all_promocion_clientes" ON promocion_clientes;
DROP POLICY IF EXISTS "venta_promocion_clientes_select" ON promocion_clientes;

CREATE POLICY "admin_all_promocion_clientes" ON promocion_clientes
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');

CREATE POLICY "venta_promocion_clientes_select" ON promocion_clientes
  FOR SELECT USING (app_role() = 'venta');
