/**
 * Falla si main.*.js gzip supera el límite (meta fase 2: ~220 KB).
 * Uso: npm run build && node scripts/check-main-bundle-size.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const TARGET_KB = 220;
const LIMIT_KB = Number(process.env.MAIN_BUNDLE_LIMIT_KB || 285);
const buildJs = path.join(__dirname, "../build/static/js");

if (!fs.existsSync(buildJs)) {
  console.error("No existe build/static/js. Ejecutá npm run build primero.");
  process.exit(1);
}

const mainFile = fs
  .readdirSync(buildJs)
  .find((f) => f.startsWith("main.") && f.endsWith(".js"));

if (!mainFile) {
  console.error("No se encontró main.*.js en build/static/js.");
  process.exit(1);
}

const raw = fs.readFileSync(path.join(buildJs, mainFile));
const gzipBytes = zlib.gzipSync(raw).length;
const gzipKb = gzipBytes / 1024;

console.log(`main chunk (${mainFile}): ${gzipKb.toFixed(1)} KB gzip (meta ${TARGET_KB} KB, límite regresión ${LIMIT_KB} KB)`);

if (gzipKb > TARGET_KB) {
  console.warn(`Por encima de la meta fase 2 (${TARGET_KB} KB gzip).`);
}

if (gzipKb > LIMIT_KB) {
  console.error(`Bundle main supera el límite de regresión (${LIMIT_KB} KB gzip).`);
  process.exit(1);
}
