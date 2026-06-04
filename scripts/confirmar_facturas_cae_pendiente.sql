-- Pasar a mock/autorizada las filas con CAE pero estado error (fallo de confirmación)
UPDATE facturas_electronicas
SET
  estado = CASE
    WHEN upper(cae) LIKE 'MOCK%' THEN 'mock'
    ELSE 'autorizada'
  END,
  error_mensaje = NULL,
  updated_at = now()
WHERE estado = 'error'
  AND cae IS NOT NULL
  AND cae <> '';
