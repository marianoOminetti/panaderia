import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Diagnóstico: en dev, si ves "NOT SET" en consola, reiniciá npm start o usá .env.production.local para el build
if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.log("[Supabase] URL:", SUPABASE_URL ? "✓" : "NOT SET", "| Anon key:", SUPABASE_ANON_KEY ? "✓" : "NOT SET");
}

export const SUPABASE_CONFIG_OK = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Fetch sin cache para evitar 304 Not Modified (respuesta sin body que rompe el cliente).
const noCacheFetch = (input, init = {}) =>
  fetch(input, { ...init, cache: "no-store" });

// Siempre crear un cliente: el SDK lanza si recibe URL vacía. Si falta config usamos placeholder
// para no romper al cargar; App muestra ConfigMissing y no se hacen requests reales.
const url = SUPABASE_URL || "https://placeholder.invalid";
const key = SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(url, key, {
  global: { fetch: noCacheFetch },
});

