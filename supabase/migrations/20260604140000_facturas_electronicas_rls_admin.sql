-- Solo admin lee facturas_electronicas (admin_all_* ya cubre admin; quitar lectura global).
DROP POLICY IF EXISTS "auth_select_facturas_electronicas" ON facturas_electronicas;
