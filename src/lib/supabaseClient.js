import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const SUPABASE_CONFIG_OK = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Importante: sin fallbacks hardcodeados. Si faltan envs, mostramos pantalla de configuración.
export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

