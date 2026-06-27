-- Desglose diario del plan semanal (Lun=0 … Dom=6 en JSON)
ALTER TABLE plan_semanal
  ADD COLUMN IF NOT EXISTS cantidad_por_dia jsonb DEFAULT NULL;

COMMENT ON COLUMN plan_semanal.cantidad_por_dia IS
  'Cantidades planificadas por día: claves "0" (lunes) a "6" (domingo). cantidad_planificada = suma.';
