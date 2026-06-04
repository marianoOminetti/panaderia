#!/usr/bin/env node
/**
 * Lista puntos de venta habilitados en WSFE (producción u homologación).
 * Uso: NODE_OPTIONS='--tls-cipher-list=DEFAULT@SECLEVEL=1' node scripts/afip-listar-puntos-venta.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Arca } from "@ramiidv/arca-facturacion";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const origFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("LoginCms")) {
    const headers = new Headers(init?.headers);
    headers.set("SOAPAction", "urn:LoginCms");
    return origFetch(input, { ...init, headers });
  }
  return origFetch(input, init);
};

const cert = fs.readFileSync(path.join(root, ".afip-local/afip-certificado.crt"), "utf8");
const key = fs.readFileSync(path.join(root, ".afip-local/afip-privada.key"), "utf8");
const production = process.env.AFIP_PRODUCTION === "true";

const arca = new Arca({
  cuit: Number(process.env.AFIP_CUIT || "27385289958"),
  cert,
  key,
  production,
});

console.log(`Entorno: ${production ? "PRODUCCIÓN" : "homologación"}\n`);

try {
  const ptos = await arca.getPuntosVenta();
  if (!ptos?.length) {
    console.log("Sin puntos de venta habilitados para WSFE.");
    console.log("Creá uno en ARCA → Comprobantes en línea → ABM Puntos de ventas.");
    process.exit(1);
  }
  for (const p of ptos) {
    const n = p.Nro ?? p.PtoVta ?? JSON.stringify(p);
    const bloq = p.FchBaja ? " (baja)" : "";
    const blk = p.Bloqueado === "S" ? " [bloqueado]" : "";
    console.log(`  Punto de venta: ${n}${bloq}${blk}`);
  }
  console.log("\nConfigurá: AFIP_PUNTO_VENTA=<número> npm run afip:setup:local");
} catch (e) {
  console.error("Error:", e.message);
  process.exit(1);
}
