-- Fix carga de stock rol venta: insert con .select() requiere SELECT en insumo_movimientos.

DROP POLICY IF EXISTS "venta_insumo_movimientos_select" ON insumo_movimientos;

CREATE POLICY "venta_insumo_movimientos_select" ON insumo_movimientos
  FOR SELECT USING (app_role() = 'venta' AND tipo = 'egreso');
