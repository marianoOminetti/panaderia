-- Forzar reload del schema cache de PostgREST
NOTIFY pgrst, 'reload schema';

-- Comentario dummy para forzar cambio en tabla
COMMENT ON TABLE pedidos IS 'Pedidos de clientes con fecha de entrega futura';
