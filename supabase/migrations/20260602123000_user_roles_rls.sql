-- RBAC por usuario + RLS por rol.
-- Roles soportados: admin, venta.

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'venta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_roles_admin_all" ON user_roles;
CREATE POLICY "user_roles_admin_all"
  ON user_roles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1
$$;

COMMENT ON FUNCTION app_role() IS 'Retorna el rol de aplicación del usuario autenticado.';

-- Limpiar políticas antiguas de acceso genérico por auth.uid().
DROP POLICY IF EXISTS "auth_required_insumos" ON insumos;
DROP POLICY IF EXISTS "auth_required_recetas" ON recetas;
DROP POLICY IF EXISTS "auth_required_receta_ingredientes" ON receta_ingredientes;
DROP POLICY IF EXISTS "auth_required_ventas" ON ventas;
DROP POLICY IF EXISTS "auth_required_clientes" ON clientes;
DROP POLICY IF EXISTS "auth_required_stock" ON stock;
DROP POLICY IF EXISTS "auth_required_insumo_stock" ON insumo_stock;
DROP POLICY IF EXISTS "auth_required_insumo_movimientos" ON insumo_movimientos;
DROP POLICY IF EXISTS "auth_required_promociones" ON promociones;
DROP POLICY IF EXISTS "auth_required_promocion_recetas" ON promocion_recetas;
DROP POLICY IF EXISTS "auth_required_plan_semanal" ON plan_semanal;
DROP POLICY IF EXISTS "Users can view all pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can insert pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can update pedidos" ON pedidos;
DROP POLICY IF EXISTS "Users can delete pedidos" ON pedidos;

-- Helpers: asegurar RLS activo en tablas clave.
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumo_composicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE precio_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE promocion_recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_electronicas ENABLE ROW LEVEL SECURITY;

-- Borrar políticas previas para dejar configuración idempotente.
DROP POLICY IF EXISTS "admin_all_insumos" ON insumos;
DROP POLICY IF EXISTS "admin_all_recetas" ON recetas;
DROP POLICY IF EXISTS "admin_all_receta_ingredientes" ON receta_ingredientes;
DROP POLICY IF EXISTS "admin_all_ventas" ON ventas;
DROP POLICY IF EXISTS "admin_all_clientes" ON clientes;
DROP POLICY IF EXISTS "admin_all_stock" ON stock;
DROP POLICY IF EXISTS "admin_all_insumo_stock" ON insumo_stock;
DROP POLICY IF EXISTS "admin_all_insumo_movimientos" ON insumo_movimientos;
DROP POLICY IF EXISTS "admin_all_insumo_composicion" ON insumo_composicion;
DROP POLICY IF EXISTS "admin_all_precio_historial" ON precio_historial;
DROP POLICY IF EXISTS "admin_all_gastos_fijos" ON gastos_fijos;
DROP POLICY IF EXISTS "admin_all_pedidos" ON pedidos;
DROP POLICY IF EXISTS "admin_all_promociones" ON promociones;
DROP POLICY IF EXISTS "admin_all_promocion_recetas" ON promocion_recetas;
DROP POLICY IF EXISTS "admin_all_plan_semanal" ON plan_semanal;
DROP POLICY IF EXISTS "admin_all_facturas_electronicas" ON facturas_electronicas;

DROP POLICY IF EXISTS "venta_ventas_all" ON ventas;
DROP POLICY IF EXISTS "venta_clientes_select" ON clientes;
DROP POLICY IF EXISTS "venta_clientes_insert" ON clientes;
DROP POLICY IF EXISTS "venta_clientes_update" ON clientes;
DROP POLICY IF EXISTS "venta_recetas_select" ON recetas;
DROP POLICY IF EXISTS "venta_stock_select" ON stock;
DROP POLICY IF EXISTS "venta_stock_update" ON stock;
DROP POLICY IF EXISTS "venta_promociones_select" ON promociones;
DROP POLICY IF EXISTS "venta_promocion_recetas_select" ON promocion_recetas;

-- Acceso total para admin.
CREATE POLICY "admin_all_insumos" ON insumos
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_recetas" ON recetas
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_receta_ingredientes" ON receta_ingredientes
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_ventas" ON ventas
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_clientes" ON clientes
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_stock" ON stock
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_insumo_stock" ON insumo_stock
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_insumo_movimientos" ON insumo_movimientos
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_insumo_composicion" ON insumo_composicion
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_precio_historial" ON precio_historial
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_gastos_fijos" ON gastos_fijos
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_pedidos" ON pedidos
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_promociones" ON promociones
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_promocion_recetas" ON promocion_recetas
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_plan_semanal" ON plan_semanal
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');
CREATE POLICY "admin_all_facturas_electronicas" ON facturas_electronicas
  FOR ALL USING (app_role() = 'admin') WITH CHECK (app_role() = 'admin');

-- Rol venta: solo lo necesario para operar ventas.
CREATE POLICY "venta_ventas_all" ON ventas
  FOR ALL USING (app_role() = 'venta') WITH CHECK (app_role() = 'venta');

CREATE POLICY "venta_clientes_select" ON clientes
  FOR SELECT USING (app_role() = 'venta');
CREATE POLICY "venta_clientes_insert" ON clientes
  FOR INSERT WITH CHECK (app_role() = 'venta');
CREATE POLICY "venta_clientes_update" ON clientes
  FOR UPDATE USING (app_role() = 'venta') WITH CHECK (app_role() = 'venta');

CREATE POLICY "venta_recetas_select" ON recetas
  FOR SELECT USING (app_role() = 'venta');

CREATE POLICY "venta_stock_select" ON stock
  FOR SELECT USING (app_role() = 'venta');
CREATE POLICY "venta_stock_insert" ON stock
  FOR INSERT WITH CHECK (app_role() = 'venta');
CREATE POLICY "venta_stock_update" ON stock
  FOR UPDATE USING (app_role() = 'venta') WITH CHECK (app_role() = 'venta');

CREATE POLICY "venta_promociones_select" ON promociones
  FOR SELECT USING (app_role() = 'venta');
CREATE POLICY "venta_promocion_recetas_select" ON promocion_recetas
  FOR SELECT USING (app_role() = 'venta');

