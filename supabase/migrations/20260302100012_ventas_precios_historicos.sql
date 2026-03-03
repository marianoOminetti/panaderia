ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS subtotal numeric,
ADD COLUMN IF NOT EXISTS descuento numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_final numeric;

UPDATE ventas 
SET subtotal = precio_unitario * cantidad,
    total_final = precio_unitario * cantidad
WHERE subtotal IS NULL;

