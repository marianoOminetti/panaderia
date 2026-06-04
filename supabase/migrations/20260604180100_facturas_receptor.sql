-- Snapshot del receptor fiscal por transacción (cobro con AFIP)
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS receptor_cuit text;
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS receptor_razon_social text;

COMMENT ON COLUMN facturas_electronicas.receptor_cuit IS 'CUIT del comprador al emitir; null = consumidor final';
COMMENT ON COLUMN facturas_electronicas.receptor_razon_social IS 'Razón social o nombre en comprobante al emitir';
