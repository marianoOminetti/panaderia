-- Auditoría de unificaciones de ventas (permite deshacer sin perder transaccion_id originales).

CREATE TABLE IF NOT EXISTS ventas_unificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  transaccion_id_destino uuid NOT NULL,
  marco_pagado boolean NOT NULL DEFAULT false,
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_unificaciones_cliente_activas
  ON ventas_unificaciones (cliente_id)
  WHERE undone_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_unificaciones_transaccion_destino
  ON ventas_unificaciones (transaccion_id_destino)
  WHERE undone_at IS NULL;

CREATE TABLE IF NOT EXISTS ventas_unificacion_lineas (
  unificacion_id uuid NOT NULL REFERENCES ventas_unificaciones(id) ON DELETE CASCADE,
  venta_id uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  transaccion_id_origen uuid,
  estado_pago_origen text NOT NULL DEFAULT 'pagado',
  medio_pago_origen text,
  PRIMARY KEY (unificacion_id, venta_id)
);

CREATE INDEX IF NOT EXISTS idx_ventas_unificacion_lineas_venta
  ON ventas_unificacion_lineas (venta_id);

COMMENT ON TABLE ventas_unificaciones IS
  'Registro de merge de ventas por transaccion_id; undone_at marca deshacer.';
COMMENT ON TABLE ventas_unificacion_lineas IS
  'Snapshot por fila de venta antes de unificar (para restaurar al deshacer).';

ALTER TABLE ventas_unificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_unificacion_lineas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_required_ventas_unificaciones" ON ventas_unificaciones;
CREATE POLICY "auth_required_ventas_unificaciones" ON ventas_unificaciones
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth_required_ventas_unificacion_lineas" ON ventas_unificacion_lineas;
CREATE POLICY "auth_required_ventas_unificacion_lineas" ON ventas_unificacion_lineas
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Unificar ventas y guardar auditoría en una sola transacción.
CREATE OR REPLACE FUNCTION public.unificar_ventas_con_auditoria(
  p_cliente_id uuid,
  p_transaccion_destino uuid,
  p_marco_pagado boolean,
  p_medio_pago text,
  p_lineas jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unificacion_id uuid;
  v_line jsonb;
  v_venta_id uuid;
BEGIN
  IF p_lineas IS NULL OR jsonb_array_length(p_lineas) < 2 THEN
    RAISE EXCEPTION 'Se requieren al menos 2 líneas para unificar';
  END IF;

  INSERT INTO ventas_unificaciones (cliente_id, transaccion_id_destino, marco_pagado)
  VALUES (p_cliente_id, p_transaccion_destino, COALESCE(p_marco_pagado, false))
  RETURNING id INTO v_unificacion_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_venta_id := (v_line->>'venta_id')::uuid;

    INSERT INTO ventas_unificacion_lineas (
      unificacion_id,
      venta_id,
      transaccion_id_origen,
      estado_pago_origen,
      medio_pago_origen
    ) VALUES (
      v_unificacion_id,
      v_venta_id,
      NULLIF(v_line->>'transaccion_id_origen', '')::uuid,
      COALESCE(v_line->>'estado_pago_origen', 'pagado'),
      NULLIF(v_line->>'medio_pago_origen', '')
    );

    UPDATE ventas
    SET
      transaccion_id = p_transaccion_destino,
      estado_pago = CASE
        WHEN COALESCE(p_marco_pagado, false) THEN 'pagado'
        ELSE estado_pago
      END,
      medio_pago = CASE
        WHEN COALESCE(p_marco_pagado, false) THEN COALESCE(NULLIF(p_medio_pago, ''), medio_pago)
        ELSE medio_pago
      END
    WHERE id = v_venta_id;
  END LOOP;

  RETURN v_unificacion_id;
END;
$$;

-- Restaura transaccion_id y estado de pago desde la auditoría.
CREATE OR REPLACE FUNCTION public.deshacer_ventas_unificacion(p_unificacion_id uuid)
RETURNS SETOF ventas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ventas_unificaciones
    WHERE id = p_unificacion_id AND undone_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Unificación no encontrada o ya deshecha';
  END IF;

  RETURN QUERY
  UPDATE ventas v
  SET
    transaccion_id = l.transaccion_id_origen,
    estado_pago = l.estado_pago_origen,
    medio_pago = l.medio_pago_origen
  FROM ventas_unificacion_lineas l
  WHERE l.unificacion_id = p_unificacion_id
    AND v.id = l.venta_id
  RETURNING v.*;

  UPDATE ventas_unificaciones
  SET undone_at = now()
  WHERE id = p_unificacion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unificar_ventas_con_auditoria(uuid, uuid, boolean, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deshacer_ventas_unificacion(uuid) TO authenticated;
