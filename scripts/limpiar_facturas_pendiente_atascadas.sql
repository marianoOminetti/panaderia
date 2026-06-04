-- Dev/staging: desbloquear ventas con AFIP colgado en "pendiente" (sin CAE)
-- Ejecutar en SQL Editor o: supabase db query --linked -f scripts/limpiar_facturas_pendiente_atascadas.sql

UPDATE facturas_electronicas
SET
  estado = 'error',
  error_mensaje = 'Registro interrumpido (pendiente vencido). Podés reintentar AFIP.',
  updated_at = now()
WHERE estado = 'pendiente'
  AND (cae IS NULL OR cae = '')
  AND updated_at < now() - interval '2 minutes';
