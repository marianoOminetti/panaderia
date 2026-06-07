-- RPC opcional para Analytics server-side (fase 2 PR E). El cliente sigue usando useAnalyticsData por ahora.
CREATE OR REPLACE FUNCTION public.ventas_resumen_mensual(p_desde date, p_hasta date)
RETURNS TABLE (
  mes text,
  ingreso numeric,
  unidades numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', v.fecha::timestamp), 'YYYY-MM') AS mes,
    sum(coalesce(v.total_final, v.precio_unitario * v.cantidad))::numeric AS ingreso,
    sum(v.cantidad)::numeric AS unidades
  FROM ventas v
  WHERE v.fecha >= p_desde
    AND v.fecha <= p_hasta
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.ventas_resumen_mensual(date, date) TO authenticated;
