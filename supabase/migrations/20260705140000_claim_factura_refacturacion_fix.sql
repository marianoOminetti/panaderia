-- Evita emisión normal cuando hay NC autorizada sobre la factura vigente.
-- Permite reintentar refacturación tras error.

CREATE OR REPLACE FUNCTION public.claim_factura_para_emision(
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
  INSERT INTO public.facturas_electronicas AS f (
    transaccion_id,
    importe_total,
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
        receptor_cuit = EXCLUDED.receptor_cuit,
        receptor_razon_social = EXCLUDED.receptor_razon_social,
        receptor_doc_tipo = EXCLUDED.receptor_doc_tipo,
        receptor_doc_nro = EXCLUDED.receptor_doc_nro,
        updated_at = now()
    WHERE f.estado NOT IN ('autorizada', 'mock')
      AND NOT (f.estado = 'error' AND f.cae IS NOT NULL)
      AND NOT (
        f.estado = 'pendiente'
        AND f.updated_at > now() - make_interval(secs => p_stale_seconds)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.notas_credito_afip AS n
        WHERE n.transaccion_id = f.transaccion_id
          AND n.estado IN ('autorizada', 'mock')
          AND n.cae IS NOT NULL
          AND n.factura_punto_venta = f.punto_venta
          AND n.factura_numero = f.numero_comprobante
      )
  RETURNING f.estado;
$$;

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
    AND (
      f.estado IN ('autorizada', 'mock')
      OR f.estado = 'error'
    )
    AND f.punto_venta IS NOT NULL
    AND f.numero_comprobante IS NOT NULL
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

NOTIFY pgrst, 'reload schema';
