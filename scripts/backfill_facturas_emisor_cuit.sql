-- Supabase SQL Editor (prod): QR en comprobantes ya emitidos
-- Reemplazá TU_CUIT_11_DIGITOS por el mismo valor que AFIP_CUIT en secrets

UPDATE facturas_electronicas
SET emisor_cuit = 'TU_CUIT_11_DIGITOS'
WHERE cae IS NOT NULL
  AND estado IN ('autorizada', 'error')
  AND (emisor_cuit IS NULL OR emisor_cuit = '');

NOTIFY pgrst, 'reload schema';
