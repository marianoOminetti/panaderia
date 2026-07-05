-- Notas de crédito AFIP vinculadas a una venta (transaccion_id).
-- Una NC por venta; no modifica la venta ni la factura original.

CREATE TABLE IF NOT EXISTS notas_credito_afip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaccion_id uuid NOT NULL UNIQUE,
  factura_tipo smallint NOT NULL DEFAULT 11,
  factura_punto_venta smallint NOT NULL,
  factura_numero bigint NOT NULL,
  factura_fecha date,
  tipo_comprobante smallint NOT NULL DEFAULT 13,
  punto_venta smallint,
  numero_comprobante bigint,
  cae text,
  cae_vencimiento date,
  importe_total numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'autorizada', 'error', 'mock')),
  error_mensaje text,
  emisor_cuit text,
  receptor_cuit text,
  receptor_razon_social text,
  receptor_doc_tipo smallint,
  receptor_doc_nro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_credito_afip_estado
  ON notas_credito_afip (estado);

COMMENT ON TABLE notas_credito_afip IS
  'Nota de crédito AFIP por venta (anulación fiscal de la factura asociada).';

ALTER TABLE notas_credito_afip ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_notas_credito_afip" ON notas_credito_afip;
DROP POLICY IF EXISTS "admin_all_notas_credito_afip" ON notas_credito_afip;

CREATE POLICY "admin_all_notas_credito_afip"
  ON notas_credito_afip
  FOR ALL
  USING (app_role() = 'admin')
  WITH CHECK (app_role() = 'admin');

-- Candado atómico para emisión de NC (evita doble click / requests concurrentes).
CREATE OR REPLACE FUNCTION public.claim_nota_credito_para_emision(
  p_transaccion_id uuid,
  p_importe_total numeric,
  p_factura_tipo smallint,
  p_factura_punto_venta smallint,
  p_factura_numero bigint,
  p_factura_fecha date,
  p_receptor_cuit text,
  p_receptor_razon_social text,
  p_receptor_doc_tipo smallint,
  p_receptor_doc_nro text,
  p_stale_seconds integer DEFAULT 90
)
RETURNS TABLE (estado text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notas_credito_afip AS n (
    transaccion_id,
    importe_total,
    factura_tipo,
    factura_punto_venta,
    factura_numero,
    factura_fecha,
    estado,
    error_mensaje,
    receptor_cuit,
    receptor_razon_social,
    receptor_doc_tipo,
    receptor_doc_nro,
    updated_at
  )
  VALUES (
    p_transaccion_id,
    p_importe_total,
    p_factura_tipo,
    p_factura_punto_venta,
    p_factura_numero,
    p_factura_fecha,
    'pendiente',
    NULL,
    p_receptor_cuit,
    p_receptor_razon_social,
    p_receptor_doc_tipo,
    p_receptor_doc_nro,
    now()
  )
  ON CONFLICT (transaccion_id) DO UPDATE
    SET estado = 'pendiente',
        error_mensaje = NULL,
        importe_total = EXCLUDED.importe_total,
        factura_tipo = EXCLUDED.factura_tipo,
        factura_punto_venta = EXCLUDED.factura_punto_venta,
        factura_numero = EXCLUDED.factura_numero,
        factura_fecha = EXCLUDED.factura_fecha,
        receptor_cuit = EXCLUDED.receptor_cuit,
        receptor_razon_social = EXCLUDED.receptor_razon_social,
        receptor_doc_tipo = EXCLUDED.receptor_doc_tipo,
        receptor_doc_nro = EXCLUDED.receptor_doc_nro,
        updated_at = now()
    WHERE n.estado NOT IN ('autorizada', 'mock')
      AND NOT (n.estado = 'error' AND n.cae IS NOT NULL)
      AND NOT (
        n.estado = 'pendiente'
        AND n.updated_at > now() - make_interval(secs => p_stale_seconds)
      )
  RETURNING n.estado;
$$;

REVOKE ALL ON FUNCTION public.claim_nota_credito_para_emision(
  uuid, numeric, smallint, smallint, bigint, date, text, text, smallint, text, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_nota_credito_para_emision(
  uuid, numeric, smallint, smallint, bigint, date, text, text, smallint, text, integer
) TO service_role;

COMMENT ON FUNCTION public.claim_nota_credito_para_emision IS
  'Reclama atómicamente la emisión de NC AFIP para una venta. Devuelve 1 fila si este request debe emitir.';

NOTIFY pgrst, 'reload schema';
