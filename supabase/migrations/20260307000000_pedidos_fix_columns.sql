-- Fix: agregar columnas hora_entrega y notas que no se aplicaron
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS hora_entrega text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS notas text;
