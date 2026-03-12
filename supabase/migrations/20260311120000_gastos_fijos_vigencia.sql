-- Agregar vigencia a gastos fijos (fecha de inicio y fin opcional)
-- Esta migración no modifica datos existentes y es retrocompatible.

ALTER TABLE gastos_fijos
  ADD COLUMN IF NOT EXISTS fecha_inicio_vigencia date;

ALTER TABLE gastos_fijos
  ADD COLUMN IF NOT EXISTS fecha_fin_vigencia date;

