-- RLS: solo usuarios autenticados pueden acceder a los datos
-- Sin sesión → 403 Forbidden en todas las tablas

-- insumos
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_insumos" ON insumos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- recetas
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_recetas" ON recetas FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- receta_ingredientes
ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_receta_ingredientes" ON receta_ingredientes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ventas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_ventas" ON ventas FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_clientes" ON clientes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- stock
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_stock" ON stock FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- insumo_stock
ALTER TABLE insumo_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_insumo_stock" ON insumo_stock FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- insumo_movimientos
ALTER TABLE insumo_movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_required_insumo_movimientos" ON insumo_movimientos FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
