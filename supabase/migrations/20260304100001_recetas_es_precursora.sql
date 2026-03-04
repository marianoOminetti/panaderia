-- Marcar recetas que pueden usarse como ingrediente de otras (precursoras).
-- Solo las que tienen es_precursora = true aparecen en el selector al cargar ingredientes.

ALTER TABLE recetas
  ADD COLUMN IF NOT EXISTS es_precursora boolean NOT NULL DEFAULT false;
