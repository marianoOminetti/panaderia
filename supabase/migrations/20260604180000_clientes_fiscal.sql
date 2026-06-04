-- Datos fiscales opcionales en ficha de cliente (prefill en cobro AFIP)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cuit text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razon_social text;

COMMENT ON COLUMN clientes.cuit IS 'CUIT 11 dígitos sin guiones; opcional';
COMMENT ON COLUMN clientes.razon_social IS 'Razón social AFIP; opcional';
