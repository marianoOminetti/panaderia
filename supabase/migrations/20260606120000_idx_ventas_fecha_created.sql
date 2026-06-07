-- Índice compuesto para queries de ventas por fecha (loadData, Analytics).
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_created
  ON public.ventas (fecha DESC, created_at DESC);
