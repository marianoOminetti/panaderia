-- Tipo y número de documento del receptor (CUIT 80, DNI 96, CF 99)

ALTER TABLE facturas_electronicas
  ADD COLUMN IF NOT EXISTS receptor_doc_tipo smallint,
  ADD COLUMN IF NOT EXISTS receptor_doc_nro text;

COMMENT ON COLUMN facturas_electronicas.receptor_doc_tipo IS 'AFIP DocTipo receptor al emitir (80 CUIT, 96 DNI, 99 CF)';
COMMENT ON COLUMN facturas_electronicas.receptor_doc_nro IS 'Número de documento receptor (sin guiones)';

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dni text;

COMMENT ON COLUMN clientes.dni IS 'DNI sin puntos; opcional para factura AFIP';

NOTIFY pgrst, 'reload schema';
