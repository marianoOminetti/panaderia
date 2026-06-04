#!/usr/bin/env bash
# Configura AFIP en Supabase leyendo cert/key desde .afip-local/
set -euo pipefail
cd "$(dirname "$0")/.."

KEY="${AFIP_KEY_FILE:-.afip-local/afip-privada.key}"
CRT="${AFIP_CERT_FILE:-.afip-local/afip-certificado.crt}"
CUIT="${AFIP_CUIT:-27385289958}"
PV="${AFIP_PUNTO_VENTA:-2}"
PROD="${AFIP_PRODUCTION:-false}"

if [[ ! -f "$KEY" ]]; then
  echo "❌ Falta $KEY"
  echo "   Copiá tu .key del Escritorio a .afip-local/afip-privada.key"
  echo "   Ver .afip-local/LEEME.txt"
  exit 1
fi
if [[ ! -f "$CRT" ]]; then
  echo "❌ Falta $CRT"
  echo "   Copiá tu .crt de Descargas a .afip-local/afip-certificado.crt"
  exit 1
fi

echo "Verificando que certificado y clave coincidan..."
MOD_CRT=$(openssl x509 -noout -modulus -in "$CRT" | openssl md5)
MOD_KEY=$(openssl rsa -noout -modulus -in "$KEY" 2>/dev/null | openssl md5)
if [[ "$MOD_CRT" != "$MOD_KEY" ]]; then
  echo "❌ El .crt y el .key NO son pareja. Usá el certificado que ARCA emitió para ese CSR."
  exit 1
fi
echo "✓ Certificado y clave privada coinciden"

npm run supabase:link --silent 2>/dev/null || npm run supabase:link

CERT_B64=$(base64 < "$CRT" | tr -d '\n')
KEY_B64=$(base64 < "$KEY" | tr -d '\n')

echo "Subiendo secrets (proyecto xdiggsdjmmylkvephyod)..."
supabase secrets set AFIP_PROVIDER=wsfe
supabase secrets set "AFIP_CUIT=${CUIT}"
supabase secrets set "AFIP_PUNTO_VENTA=${PV}"
supabase secrets set "AFIP_PRODUCTION=${PROD}"
supabase secrets set "AFIP_CERT_B64=${CERT_B64}"
supabase secrets set "AFIP_KEY_B64=${KEY_B64}"
supabase secrets unset AFIP_ALLOW_MOCK 2>/dev/null || true

echo "Desplegando registrar-en-afip..."
npm run functions:deploy:afip

echo ""
echo "✅ Listo. Probá una venta con «Registrar en AFIP»."
echo "   Homologación: AFIP_PRODUCTION=false (default en este script)"
echo "   Producción:   AFIP_PRODUCTION=true npm run afip:setup:local"
