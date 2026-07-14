-- No borrar CAE de NC anterior hasta que la nueva emisión confirme en persistirNcEmitida.

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
    WHERE (
      n.estado NOT IN ('autorizada', 'mock')
      OR (
        n.estado IN ('autorizada', 'mock')
        AND EXISTS (
          SELECT 1
          FROM public.facturas_electronicas AS f
          WHERE f.transaccion_id = p_transaccion_id
            AND f.cae IS NOT NULL
            AND f.estado IN ('autorizada', 'mock')
            AND (
              f.punto_venta IS DISTINCT FROM n.factura_punto_venta
              OR f.numero_comprobante IS DISTINCT FROM n.factura_numero
            )
        )
      )
    )
      AND NOT (n.estado = 'error' AND n.cae IS NOT NULL)
      AND NOT (
        n.estado = 'pendiente'
        AND n.updated_at > now() - make_interval(secs => p_stale_seconds)
      )
  RETURNING n.estado;
$$;

NOTIFY pgrst, 'reload schema';
