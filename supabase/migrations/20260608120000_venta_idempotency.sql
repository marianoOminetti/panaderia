-- Idempotencia de ventas por transaccion_id (evita duplicados en retry/sync offline).

CREATE TABLE IF NOT EXISTS public.venta_transacciones (
  transaccion_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text
);

COMMENT ON TABLE public.venta_transacciones IS
  'Una fila por transacción de venta; varias filas en ventas comparten el mismo transaccion_id.';

ALTER TABLE public.venta_transacciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_required_venta_transacciones" ON public.venta_transacciones;
CREATE POLICY "auth_required_venta_transacciones" ON public.venta_transacciones
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.insert_ventas_idempotente(
  p_rows jsonb,
  p_source text DEFAULT 'online'
)
RETURNS SETOF public.ventas
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_claimed uuid;
BEGIN
  IF p_rows IS NULL OR jsonb_array_length(p_rows) = 0 THEN
    RETURN;
  END IF;

  v_tx_id := NULLIF(p_rows->0->>'transaccion_id', '')::uuid;

  IF v_tx_id IS NULL THEN
    RETURN QUERY
    INSERT INTO ventas (
      receta_id,
      cantidad,
      precio_unitario,
      subtotal,
      descuento,
      total_final,
      fecha,
      cliente_id,
      medio_pago,
      estado_pago,
      promocion_id,
      transaccion_id
    )
    SELECT
      (elem->>'receta_id')::uuid,
      (elem->>'cantidad')::numeric,
      (elem->>'precio_unitario')::numeric,
      NULLIF(elem->>'subtotal', '')::numeric,
      COALESCE(NULLIF(elem->>'descuento', '')::numeric, 0),
      NULLIF(elem->>'total_final', '')::numeric,
      (elem->>'fecha')::date,
      NULLIF(elem->>'cliente_id', '')::uuid,
      COALESCE(elem->>'medio_pago', 'efectivo'),
      COALESCE(elem->>'estado_pago', 'pagado'),
      NULLIF(elem->>'promocion_id', '')::uuid,
      NULLIF(elem->>'transaccion_id', '')::uuid
    FROM jsonb_array_elements(p_rows) AS elem
    RETURNING *;
    RETURN;
  END IF;

  INSERT INTO venta_transacciones (transaccion_id, source)
  VALUES (v_tx_id, p_source)
  ON CONFLICT (transaccion_id) DO NOTHING
  RETURNING transaccion_id INTO v_claimed;

  IF v_claimed IS NULL THEN
    RETURN QUERY SELECT * FROM ventas WHERE transaccion_id = v_tx_id ORDER BY created_at;
    RETURN;
  END IF;

  BEGIN
    RETURN QUERY
    INSERT INTO ventas (
      receta_id,
      cantidad,
      precio_unitario,
      subtotal,
      descuento,
      total_final,
      fecha,
      cliente_id,
      medio_pago,
      estado_pago,
      promocion_id,
      transaccion_id
    )
    SELECT
      (elem->>'receta_id')::uuid,
      (elem->>'cantidad')::numeric,
      (elem->>'precio_unitario')::numeric,
      NULLIF(elem->>'subtotal', '')::numeric,
      COALESCE(NULLIF(elem->>'descuento', '')::numeric, 0),
      NULLIF(elem->>'total_final', '')::numeric,
      (elem->>'fecha')::date,
      NULLIF(elem->>'cliente_id', '')::uuid,
      COALESCE(elem->>'medio_pago', 'efectivo'),
      COALESCE(elem->>'estado_pago', 'pagado'),
      NULLIF(elem->>'promocion_id', '')::uuid,
      v_tx_id
    FROM jsonb_array_elements(p_rows) AS elem
    RETURNING *;
  EXCEPTION
    WHEN OTHERS THEN
      DELETE FROM venta_transacciones WHERE transaccion_id = v_tx_id;
      RAISE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_ventas_idempotente(jsonb, text) TO authenticated;
