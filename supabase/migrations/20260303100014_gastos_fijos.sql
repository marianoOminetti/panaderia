-- Gastos fijos de la panadería
CREATE TABLE IF NOT EXISTS gastos_fijos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  monto numeric NOT NULL,
  frecuencia text NOT NULL CHECK (frecuencia IN ('diario','semanal','mensual')),
  activo boolean DEFAULT true
);

