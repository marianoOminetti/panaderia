-- Rol venta: upsert de stock al registrar venta requiere INSERT además de UPDATE.

DROP POLICY IF EXISTS "venta_stock_insert" ON stock;
CREATE POLICY "venta_stock_insert" ON stock
  FOR INSERT WITH CHECK (app_role() = 'venta');
