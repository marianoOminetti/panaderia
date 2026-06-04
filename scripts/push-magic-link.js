#!/usr/bin/env node
/**
 * Genera link mágico para abrir prod en Más (activar push en el teléfono).
 *   node scripts/push-magic-link.js
 *   node scripts/push-magic-link.js mariano.ominetti@gmail.com
 */
const { execSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const PROD_REF = "clgxrxlccjjqxzvapfav";
const APP = "https://panaderia-ten.vercel.app/?tab=mas";
const email = process.argv[2] || "mariano.ominetti@gmail.com";

async function main() {
  const raw = execSync(`supabase projects api-keys --project-ref ${PROD_REF} -o json 2>/dev/null`, {
    encoding: "utf8",
  });
  const end = raw.lastIndexOf("]");
  const serviceKey = JSON.parse(raw.slice(0, end + 1)).find((k) => k.name === "service_role").api_key;
  const sb = createClient(`https://${PROD_REF}.supabase.co`, serviceKey);

  const redirect = encodeURIComponent(APP);
  const { data, error } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: APP },
  });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  let link = data.properties?.action_link || data.action_link;
  link = link.replace(/redirect_to=[^&]+/, `redirect_to=${redirect}`);
  console.log("\nAbrí este link en el teléfono (Chrome/Android o PWA en iPhone):\n");
  console.log(link);
  console.log("\nLuego: Más → Activar notificaciones → Enviar prueba\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
