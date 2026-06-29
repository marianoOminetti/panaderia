/** Trim + UPPERCASE para nombres de insumos, recetas y familias. */
export function normalizeNombreUpper(value) {
  return (value ?? "").trim().toUpperCase();
}

/** Como normalizeNombreUpper pero devuelve null si queda vacío (p. ej. familia opcional). */
export function normalizeNombreUpperOrNull(value) {
  const n = normalizeNombreUpper(value);
  return n || null;
}
