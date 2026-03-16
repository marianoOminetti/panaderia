-- Extender gastos_fijos para soportar tipo (fijo/variable/puntual) y fecha
-- Los gastos existentes se consideran tipo 'fijo' (comportamiento actual)

-- 1. Agregar columna tipo con default 'fijo' (retrocompatibilidad)
ALTER TABLE gastos_fijos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'fijo';

-- Evitar error si el constraint ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gastos_fijos_tipo_check'
    AND conrelid = 'gastos_fijos'::regclass
  ) THEN
    ALTER TABLE gastos_fijos ADD CONSTRAINT gastos_fijos_tipo_check
      CHECK (tipo IN ('fijo', 'variable', 'puntual'));
  END IF;
END $$;

-- 2. Agregar columna fecha (nullable, solo para variable y puntual)
ALTER TABLE gastos_fijos
  ADD COLUMN IF NOT EXISTS fecha date;

-- 3. Hacer frecuencia nullable para variable/puntual
ALTER TABLE gastos_fijos
  DROP CONSTRAINT IF EXISTS gastos_fijos_frecuencia_check;
ALTER TABLE gastos_fijos
  ADD CONSTRAINT gastos_fijos_frecuencia_check
  CHECK (frecuencia IS NULL OR frecuencia IN ('diario','semanal','mensual'));
ALTER TABLE gastos_fijos
  ALTER COLUMN frecuencia DROP NOT NULL;
