-- Permitir rinde con decimales (ej. 11.1 kg)
ALTER TABLE recetas ALTER COLUMN rinde TYPE numeric USING rinde::numeric;
