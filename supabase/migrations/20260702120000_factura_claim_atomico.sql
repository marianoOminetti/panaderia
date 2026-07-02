-- Candado atómico para emisión AFIP: garantiza que una venta (transaccion_id)
-- se emita como máximo una vez, incluso con requests concurrentes (doble click,
-- múltiples pestañas o dispositivos).
--
-- Reemplaza el patrón check-then-upsert de la Edge Function (TOCTOU) por un
-- único INSERT ... ON CONFLICT DO UPDATE con guardas: solo "reclama" la emisión
-- (deja estado 'pendiente') quien encuentra la fila en un estado reclamable.
-- Si devuelve una fila => este request ganó y debe emitir. Si no devuelve nada
-- => otro request ya está emitiendo, o ya hay comprobante autorizado / con CAE.
--
-- Atomicidad: el ON CONFLICT toma un row-lock sobre la fila en disputa; el
-- segundo request espera al commit del primero y reevalúa el WHERE contra la
-- fila ya marcada 'pendiente' fresca => WHERE falso => 0 filas.

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
  RETURNING f.estado;
$$;

REVOKE ALL ON FUNCTION public.claim_factura_para_emision(
  uuid, numeric, text, text, smallint, text, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_factura_para_emision(
  uuid, numeric, text, text, smallint, text, integer
) TO service_role;

COMMENT ON FUNCTION public.claim_factura_para_emision IS
  'Reclama atómicamente la emisión AFIP de una venta. Devuelve 1 fila si este request debe emitir; 0 filas si ya está en curso/emitida. Evita doble emisión concurrente.';

NOTIFY pgrst, 'reload schema';
