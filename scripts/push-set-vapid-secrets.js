#!/usr/bin/env node
/**
 * Aplica VAPID_PRIVATE_KEY (JWK JSON) a Supabase prod y dev vía CLI.
 *
 *   node scripts/push-set-vapid-secrets.js --file .vapid-keys.local.json
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PROD_REF = "clgxrxlccjjqxzvapfav";
const DEV_REF = "xdiggsdjmmylkvephyod";
const ROOT = path.resolve(__dirname, "..");

function loadKeys() {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const file = fileArg
    ? fileArg.split("=")[1]
    : process.argv.includes("--file")
      ? process.argv[process.argv.indexOf("--file") + 1]
      : ".vapid-keys.local.json";

  const raw = fs.readFileSync(path.resolve(ROOT, file), "utf8");
  const parsed = JSON.parse(raw);
  const privateJWK = parsed.privateJWK || parsed;
  const publicKey = parsed.publicKey;
  if (!privateJWK?.kty || !privateJWK?.d) {
    throw new Error("privateJWK inválido en " + file);
  }
  return { privateJWK, publicKey };
}

function setSecret(projectRef, privateJWK) {
  const tmp = path.join(os.tmpdir(), `vapid-${projectRef}.env`);
  fs.writeFileSync(tmp, `VAPID_PRIVATE_KEY=${JSON.stringify(privateJWK)}\n`, "utf8");
  try {
    execSync(`supabase link --project-ref ${projectRef}`, {
      stdio: "inherit",
      cwd: ROOT,
    });
    execSync(`supabase secrets set --env-file "${tmp}"`, {
      stdio: "inherit",
      cwd: ROOT,
    });
  } finally {
    fs.unlinkSync(tmp);
  }
}

function main() {
  const { privateJWK, publicKey } = loadKeys();
  console.log("Aplicando VAPID en prod y dev…");
  setSecret(PROD_REF, privateJWK);
  setSecret(DEV_REF, privateJWK);
  console.log("\n✅ Secrets actualizados.");
  if (publicKey) {
    console.log("\nREACT_APP_VAPID_PUBLIC_KEY (Vercel Production + .env.*.local):");
    console.log(publicKey);
  }
  console.log("\nSiguiente: npm run push:deploy");
  console.log("Usuarios: Más → Activar notificaciones (re-suscribir tras rotar claves).");
}

main();
