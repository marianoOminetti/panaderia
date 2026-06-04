-- CUIT emisor al emitir (QR RG 4892 sin depender de REACT_APP_AFIP_CUIT en el build)

ALTER TABLE facturas_electronicas
  ADD COLUMN IF NOT EXISTS emisor_cuit text;

COMMENT ON COLUMN facturas_electronicas.emisor_cuit IS
  'CUIT del negocio al emitir; para QR en comprobante';
