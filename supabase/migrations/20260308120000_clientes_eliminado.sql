-- Eliminación lógica de clientes: no se pierden ventas ni referencias
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS eliminado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN clientes.eliminado IS 'Si true, el cliente está dado de baja (no se muestra en lista); las ventas/pedidos siguen vinculados.';
