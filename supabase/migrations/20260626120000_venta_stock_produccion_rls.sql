-- Rol venta: lectura de recetas/insumos para cargar producción en Stock
-- y egreso de insumos al registrar producción (trigger actualiza insumo_stock).

DROP POLICY IF EXISTS "venta_insumos_select" ON insumos;
DROP POLICY IF EXISTS "venta_receta_ingredientes_select" ON receta_ingredientes;
DROP POLICY IF EXISTS "venta_insumo_stock_select" ON insumo_stock;
DROP POLICY IF EXISTS "venta_insumo_composicion_select" ON insumo_composicion;
DROP POLICY IF EXISTS "venta_insumo_movimientos_egreso_insert" ON insumo_movimientos;

CREATE POLICY "venta_insumos_select" ON insumos
  FOR SELECT USING (app_role() = 'venta');

CREATE POLICY "venta_receta_ingredientes_select" ON receta_ingredientes
  FOR SELECT USING (app_role() = 'venta');

CREATE POLICY "venta_insumo_stock_select" ON insumo_stock
  FOR SELECT USING (app_role() = 'venta');

CREATE POLICY "venta_insumo_composicion_select" ON insumo_composicion
  FOR SELECT USING (app_role() = 'venta');

CREATE POLICY "venta_insumo_movimientos_egreso_insert" ON insumo_movimientos
  FOR INSERT
  WITH CHECK (app_role() = 'venta' AND tipo = 'egreso');
