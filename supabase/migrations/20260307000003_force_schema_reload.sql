-- Forzar recarga del schema renombrando y volviendo a renombrar
ALTER TABLE pedidos RENAME COLUMN hora_entrega TO hora_entrega_tmp;
ALTER TABLE pedidos RENAME COLUMN hora_entrega_tmp TO hora_entrega;

ALTER TABLE pedidos RENAME COLUMN notas TO notas_tmp;
ALTER TABLE pedidos RENAME COLUMN notas_tmp TO notas;

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
