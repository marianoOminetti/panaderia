-- Ejecutar en Supabase → SQL Editor (proyecto que usa la app)
-- Corrige: Could not find the 'cuit' column of 'clientes' in the schema cache

-- 1) Ficha de cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cuit text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razon_social text;

COMMENT ON COLUMN clientes.cuit IS 'CUIT 11 dígitos sin guiones; opcional';
COMMENT ON COLUMN clientes.razon_social IS 'Razón social AFIP; opcional';

-- 2) Snapshot por venta (AFIP)
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS receptor_cuit text;
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS receptor_razon_social text;
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS receptor_doc_tipo smallint;
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS receptor_doc_nro text;

COMMENT ON COLUMN facturas_electronicas.receptor_cuit IS 'CUIT del comprador al emitir; null = consumidor final';
COMMENT ON COLUMN facturas_electronicas.receptor_razon_social IS 'Razón social o nombre en comprobante al emitir';
COMMENT ON COLUMN facturas_electronicas.receptor_doc_tipo IS 'AFIP DocTipo (80 CUIT, 96 DNI, 99 CF)';
COMMENT ON COLUMN facturas_electronicas.receptor_doc_nro IS 'Número documento receptor';

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dni text;
COMMENT ON COLUMN clientes.dni IS 'DNI sin puntos; opcional para factura AFIP';

-- Refrescar caché de PostgREST (por si el error persiste unos segundos)
NOTIFY pgrst, 'reload schema';
