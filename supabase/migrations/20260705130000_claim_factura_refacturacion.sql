-- Candado atómico para refacturar tras nota de crédito autorizada.
-- Solo reclama si la factura vigente coincide con la anulada por la NC.

CREATE OR REPLACE FUNCTION public.claim_factura_para_refacturacion(
  p_transaccion_id uuid,
  p_importe_total numeric,
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
  UPDATE public.facturas_electronicas AS f
    SET estado = 'pendiente',
        error_mensaje = NULL,
        importe_total = p_importe_total,
        receptor_cuit = p_receptor_cuit,
        receptor_razon_social = p_receptor_razon_social,
        receptor_doc_tipo = p_receptor_doc_tipo,
        receptor_doc_nro = p_receptor_doc_nro,
        updated_at = now()
  WHERE f.transaccion_id = p_transaccion_id
    AND f.cae IS NOT NULL
    AND (
      f.estado IN ('autorizada', 'mock')
      OR (f.estado = 'error' AND f.cae IS NULL)
    )
    AND NOT (
      f.estado = 'pendiente'
      AND f.updated_at > now() - make_interval(secs => p_stale_seconds)
    )
    AND EXISTS (
      SELECT 1
      FROM public.notas_credito_afip AS n
      WHERE n.transaccion_id = p_transaccion_id
        AND n.estado IN ('autorizada', 'mock')
        AND n.cae IS NOT NULL
        AND n.factura_punto_venta = f.punto_venta
        AND n.factura_numero = f.numero_comprobante
    )
  RETURNING f.estado;
$$;

REVOKE ALL ON FUNCTION public.claim_factura_para_refacturacion(
  uuid, numeric, text, text, smallint, text, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_factura_para_refacturacion(
  uuid, numeric, text, text, smallint, text, integer
) TO service_role;

COMMENT ON FUNCTION public.claim_factura_para_refacturacion IS
  'Reclama refacturación AFIP: factura vigente anulada por NC autorizada. Devuelve 1 fila si debe emitir.';

NOTIFY pgrst, 'reload schema';
