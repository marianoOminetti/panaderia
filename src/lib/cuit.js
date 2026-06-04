/** Solo dígitos del CUIT (hasta 11). */
export function normalizeCuitInput(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

/** Valida dígito verificador AFIP (módulo 11). */
export function isValidCuit(cuit) {
  const s = normalizeCuitInput(cuit);
  if (s.length !== 11) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = s.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * mult[i];
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) check = 9;
  return check === digits[10];
}

/** Formato habitual en comprobantes: XX-XXXXXXXX-X */
export function formatCuitDisplay(cuit) {
  const s = normalizeCuitInput(cuit);
  if (s.length !== 11) return s;
  return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
}

/** Muestra CUIT enmascarado: ***-***-xxxx */
export function maskCuit(cuit) {
  const s = normalizeCuitInput(cuit);
  if (s.length < 4) return s;
  return `***-***-${s.slice(-4)}`;
}
