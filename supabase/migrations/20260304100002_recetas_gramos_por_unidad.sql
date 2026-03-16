-- Para recetas precursoras: cuántos gramos equivale 1 unidad (permite cargar "45g de MASA SABLE").
-- Si está en null, solo se puede usar por unidad (u).

ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS gramos_por_unidad numeric;
