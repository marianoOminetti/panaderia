-- Alinear CHECK con medios de pago del frontend (VentasSelectors).

ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_medio_pago_check;

ALTER TABLE ventas
  ADD CONSTRAINT ventas_medio_pago_check
  CHECK (medio_pago IN ('efectivo', 'transferencia', 'debito', 'credito'));
