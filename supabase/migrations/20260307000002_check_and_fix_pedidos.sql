-- Verificar y agregar columnas faltantes en pedidos
DO $$
BEGIN
  -- Agregar hora_entrega si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'hora_entrega'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN hora_entrega text;
    RAISE NOTICE 'Added column hora_entrega';
  ELSE
    RAISE NOTICE 'Column hora_entrega already exists';
  END IF;

  -- Agregar notas si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'notas'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN notas text;
    RAISE NOTICE 'Added column notas';
  ELSE
    RAISE NOTICE 'Column notas already exists';
  END IF;
END $$;

-- Forzar recarga del schema de PostgREST
NOTIFY pgrst, 'reload schema';
