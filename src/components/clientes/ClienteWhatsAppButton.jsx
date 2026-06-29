import {
  mensajeRetencionCliente,
  mensajeGenericoCliente,
  abrirWhatsAppCliente,
  copiarTelefonoCliente,
} from "../../lib/whatsappCliente";

export default function ClienteWhatsAppButton({
  cliente,
  diasDesdeUltima,
  favoritoNombre,
  compact = false,
  variant = "generico",
  showToast,
}) {
  const telefono = cliente?.telefono?.trim();
  if (!telefono) return null;

  const mensaje =
    variant === "retencion"
      ? mensajeRetencionCliente({
          nombre: cliente.nombre,
          diasDesdeUltima,
          favoritoNombre,
        })
      : mensajeGenericoCliente({ nombre: cliente.nombre });

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = abrirWhatsAppCliente(telefono, mensaje);
    if (!ok) {
      const copied = await copiarTelefonoCliente(telefono);
      showToast?.(
        copied
          ? "Número copiado — pegalo en WhatsApp"
          : "No se pudo abrir WhatsApp con ese teléfono",
      );
    }
  };

  return (
    <button
      type="button"
      className={`cliente-wa-btn${compact ? " cliente-wa-btn--compact" : ""}`}
      onClick={handleClick}
      aria-label={`Escribirle a ${cliente.nombre} por WhatsApp`}
    >
      {compact ? "💬" : "💬 Escribirle"}
    </button>
  );
}
