-- Comprobantes electrónicos AFIP vinculados a una venta (transaccion_id)
CREATE TABLE IF NOT EXISTS facturas_electronicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaccion_id uuid NOT NULL UNIQUE,
  tipo_comprobante smallint,
  punto_venta smallint,
  numero_comprobante bigint,
  cae text,
  cae_vencimiento date,
  importe_total numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'autorizada', 'error', 'mock')),
  error_mensaje text,
  pdf_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facturas_electronicas_estado
  ON facturas_electronicas (estado);

COMMENT ON TABLE facturas_electronicas IS
  'Registro fiscal AFIP por venta agrupada (transaccion_id). PDF opcional en fase posterior.';

ALTER TABLE facturas_electronicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_required_facturas_electronicas" ON facturas_electronicas;
DROP POLICY IF EXISTS "auth_select_facturas_electronicas" ON facturas_electronicas;

-- Solo lectura desde el cliente; escrituras vía service_role (Edge Function)
CREATE POLICY "auth_select_facturas_electronicas"
  ON facturas_electronicas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
