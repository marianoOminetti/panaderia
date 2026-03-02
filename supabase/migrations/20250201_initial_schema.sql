-- Esquema base: insumos, recetas, receta_ingredientes, ventas
-- Debe ejecutarse antes de las demás migraciones

CREATE TABLE IF NOT EXISTS insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text NOT NULL,
  presentacion text,
  precio numeric NOT NULL DEFAULT 0,
  cantidad_presentacion numeric NOT NULL DEFAULT 1,
  unidad text NOT NULL DEFAULT 'g',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  emoji text DEFAULT '🍞',
  rinde integer NOT NULL DEFAULT 1,
  unidad_rinde text DEFAULT 'u',
  precio_venta numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES insumos(id) ON DELETE SET NULL,
  cantidad numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'g',
  costo_fijo numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_receta ON receta_ingredientes(receta_id);

CREATE TABLE IF NOT EXISTS ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  cantidad numeric NOT NULL,
  precio_unitario numeric NOT NULL,
  fecha date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_created ON ventas(created_at DESC);
