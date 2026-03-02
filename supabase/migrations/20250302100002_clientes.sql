-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  created_at timestamptz DEFAULT now()
);

-- Agregar cliente_id a ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id);
