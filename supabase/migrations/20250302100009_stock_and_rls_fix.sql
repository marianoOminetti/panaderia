-- Fix stock (esquema viejo o inexistente) + RLS en una sola migración
-- Para evitar conflictos de historial, aplicamos todo lo pendiente

-- 1. Stock: crear si no existe, o recrear si tiene esquema viejo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock') THEN
    CREATE TABLE stock (
      receta_id uuid PRIMARY KEY REFERENCES recetas(id) ON DELETE CASCADE,
      cantidad numeric NOT NULL DEFAULT 0,
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_stock_receta ON stock(receta_id);
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock' AND column_name = 'receta_id') THEN
    DROP TABLE stock;
    CREATE TABLE stock (
      receta_id uuid PRIMARY KEY REFERENCES recetas(id) ON DELETE CASCADE,
      cantidad numeric NOT NULL DEFAULT 0,
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_stock_receta ON stock(receta_id);
  END IF;
END $$;

-- 2. insumo_stock e insumo_movimientos si no existen
CREATE TABLE IF NOT EXISTS insumo_stock (
  insumo_id uuid PRIMARY KEY REFERENCES insumos(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS insumo_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  cantidad numeric NOT NULL,
  valor numeric,
  nota text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_insumo ON insumo_movimientos(insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumo_mov_created ON insumo_movimientos(created_at DESC);

-- 3. RLS fix (idempotente)
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_insumos" ON insumos;
CREATE POLICY "auth_required_insumos" ON insumos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_recetas" ON recetas;
CREATE POLICY "auth_required_recetas" ON recetas FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_receta_ingredientes" ON receta_ingredientes;
CREATE POLICY "auth_required_receta_ingredientes" ON receta_ingredientes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_ventas" ON ventas;
CREATE POLICY "auth_required_ventas" ON ventas FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_clientes" ON clientes;
CREATE POLICY "auth_required_clientes" ON clientes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_stock" ON stock;
CREATE POLICY "auth_required_stock" ON stock FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE insumo_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_insumo_stock" ON insumo_stock;
CREATE POLICY "auth_required_insumo_stock" ON insumo_stock FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE insumo_movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_required_insumo_movimientos" ON insumo_movimientos;
CREATE POLICY "auth_required_insumo_movimientos" ON insumo_movimientos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
