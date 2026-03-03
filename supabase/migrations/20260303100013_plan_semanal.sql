-- Plan de producción semanal: cuánto se planea producir por receta por semana
-- y cuánto ya se registró como producido (descuenta insumos al marcar "Producir ahora")

CREATE TABLE IF NOT EXISTS plan_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio date NOT NULL,
  receta_id uuid NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  cantidad_planificada numeric NOT NULL DEFAULT 0,
  cantidad_realizada numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(semana_inicio, receta_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_semanal_semana ON plan_semanal(semana_inicio);
CREATE INDEX IF NOT EXISTS idx_plan_semanal_receta ON plan_semanal(receta_id);

-- RLS
ALTER TABLE plan_semanal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_plan_semanal" ON plan_semanal
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Opcional: proveedor en insumos para agrupar la lista de compras por proveedor
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS proveedor text;
