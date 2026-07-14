-- Reload PostgREST after pedidos promo columns (ya aplicadas en demasiados ambientes).
NOTIFY pgrst, 'reload schema';
