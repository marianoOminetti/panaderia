#!/usr/bin/env bash
# Configura secrets de AFIP directo (wsfe) en Supabase sin exponerlos en el repo.
# Uso:
#   ./scripts/afip-setup-secrets.sh
# O con variables:
#   AFIP_CUIT=20123456789 AFIP_PUNTO_VENTA=1 AFIP_CERT=./cert.crt AFIP_KEY=./privada.key ./scripts/afip-setup-secrets.sh
#
# Requiere: supabase CLI logueado y proyecto linkeado (npm run supabase:link)

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== AFIP → Supabase secrets (wsfe directo) ==="
echo "Proyecto linkeado:"
npm run supabase:link --silent 2>/dev/null || npm run supabase:link

read -r -p "CUIT (solo números): " AFIP_CUIT
read -r -p "Punto de venta [1]: " AFIP_PUNTO_VENTA
AFIP_PUNTO_VENTA=${AFIP_PUNTO_VENTA:-1}

read -r -p "Ruta al certificado .crt de ARCA: " AFIP_CERT
read -r -p "Ruta a la clave privada .key: " AFIP_KEY

if [[ ! -f "$AFIP_CERT" ]]; then
  echo "❌ No existe el certificado: $AFIP_CERT"
  exit 1
fi
if [[ ! -f "$AFIP_KEY" ]]; then
  echo "❌ No existe la clave: $AFIP_KEY"
  exit 1
fi

read -r -p "¿Homologación (h) o Producción (p)? [h]: " ENV_MODE
ENV_MODE=${ENV_MODE:-h}
if [[ "$ENV_MODE" == "p" || "$ENV_MODE" == "P" ]]; then
  AFIP_PRODUCTION=true
  echo "→ AFIP_PRODUCTION=true"
else
  AFIP_PRODUCTION=false
  echo "→ AFIP_PRODUCTION=false (homologación)"
fi

read -r -p "¿Quitar modo mock AFIP_ALLOW_MOCK? (s/n) [s]: " UNMOCK
UNMOCK=${UNMOCK:-s}

CERT_B64=$(base64 < "$AFIP_CERT" | tr -d '\n')
KEY_B64=$(base64 < "$AFIP_KEY" | tr -d '\n')

echo ""
echo "Subiendo secrets a Supabase (no se guardan en git)..."
supabase secrets set AFIP_PROVIDER=wsfe
supabase secrets set "AFIP_CUIT=${AFIP_CUIT}"
supabase secrets set "AFIP_PUNTO_VENTA=${AFIP_PUNTO_VENTA}"
supabase secrets set "AFIP_PRODUCTION=${AFIP_PRODUCTION}"
supabase secrets set "AFIP_CERT_B64=${CERT_B64}"
supabase secrets set "AFIP_KEY_B64=${KEY_B64}"

if [[ "$UNMOCK" == "s" || "$UNMOCK" == "S" ]]; then
  supabase secrets unset AFIP_ALLOW_MOCK 2>/dev/null || true
  echo "→ AFIP_ALLOW_MOCK removido"
fi

echo ""
echo "Desplegando Edge Function registrar-en-afip..."
npm run functions:deploy:afip

echo ""
echo "✅ Listo. Probá una venta con «Registrar en AFIP»."
echo "   Logs: Supabase Dashboard → Edge Functions → registrar-en-afip"
