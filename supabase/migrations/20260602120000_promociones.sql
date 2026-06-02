-- Promociones vigentes (ej. llevá 5 pagá 4) y vínculo con ventas

CREATE TABLE IF NOT EXISTS promociones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'nxm',
  llevar integer NOT NULL DEFAULT 5,
  pagar integer NOT NULL DEFAULT 4,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT promociones_pagar_menor_llevar CHECK (pagar > 0 AND llevar > pagar)
);

CREATE TABLE IF NOT EXISTS promocion_recetas (
  promocion_id uuid NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
  receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  PRIMARY KEY (promocion_id, receta_id)
);

CREATE INDEX IF NOT EXISTS idx_promocion_recetas_receta ON promocion_recetas(receta_id);

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS promocion_id uuid REFERENCES promociones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_promocion_id ON ventas(promocion_id);

ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocion_recetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_required_promociones" ON promociones;
CREATE POLICY "auth_required_promociones" ON promociones
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth_required_promocion_recetas" ON promocion_recetas;
CREATE POLICY "auth_required_promocion_recetas" ON promocion_recetas
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
