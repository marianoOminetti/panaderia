-- Seed ventas para paginación (Clientes del día en Analytics)
-- Copiar y pegar en Supabase Dashboard > SQL Editor > New query
-- Requiere que existan recetas (npm run import-recetas)

-- 1. Insertar clientes que no existan
INSERT INTO clientes (nombre)
SELECT n FROM (VALUES
  ('María García'),
  ('Juan Pérez'),
  ('Panadería El Sol'),
  ('Ana Rodríguez'),
  ('Carlos López'),
  ('Laura Martínez'),
  ('Roberto Fernández'),
  ('Claudia Sánchez'),
  ('Diego González'),
  ('Patricia Díaz'),
  ('Miguel Torres'),
  ('Sofía Ramírez'),
  ('Andrés Flores'),
  ('Valentina Romero'),
  ('Lucas Herrera'),
  ('Camila Castro'),
  ('Martín Ruiz'),
  ('Lucía Morales'),
  ('Nicolás Ortiz'),
  ('Emma Vargas'),
  ('Santiago Jiménez'),
  ('Isabella Mendoza'),
  ('Mateo Silva'),
  ('Victoria Ríos'),
  ('Benjamín Vega')
) AS t(n)
WHERE NOT EXISTS (
  SELECT 1 FROM clientes c
  WHERE lower(trim(c.nombre)) = lower(trim(t.n))
);

-- 2. Insertar ventas (una por cliente, para hoy)
INSERT INTO ventas (
  receta_id,
  cantidad,
  precio_unitario,
  total_final,
  fecha,
  cliente_id,
  medio_pago,
  estado_pago
)
SELECT
  (SELECT id FROM recetas LIMIT 1),
  (1 + (row_number() OVER (ORDER BY c.nombre) - 1) % 3)::numeric,
  (SELECT COALESCE(precio_venta, 1000) FROM recetas LIMIT 1),
  (1 + (row_number() OVER (ORDER BY c.nombre) - 1) % 3)::numeric * (SELECT COALESCE(precio_venta, 1000) FROM recetas LIMIT 1),
  current_date,
  c.id,
  'efectivo',
  'pagado'
FROM clientes c
WHERE lower(trim(c.nombre)) IN (
  'maría garcía', 'juan pérez', 'panadería el sol', 'ana rodríguez', 'carlos lópez',
  'laura martínez', 'roberto fernández', 'claudia sánchez', 'diego gonzález', 'patricia díaz',
  'miguel torres', 'sofía ramírez', 'andrés flores', 'valentina romero', 'lucas herrera',
  'camila castro', 'martín ruiz', 'lucía morales', 'nicolás ortiz', 'emma vargas',
  'santiago jiménez', 'isabella mendoza', 'mateo silva', 'victoria ríos', 'benjamín vega'
)
ORDER BY c.nombre
LIMIT 25;
