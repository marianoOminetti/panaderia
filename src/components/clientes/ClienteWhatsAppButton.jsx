import { mensajeRetencionCliente, abrirWhatsAppCliente } from "../../lib/whatsappCliente";

export default function ClienteWhatsAppButton({
  cliente,
  diasDesdeUltima,
  favoritoNombre,
  compact = false,
  showToast,
}) {
  const telefono = cliente?.telefono?.trim();
  if (!telefono) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = abrirWhatsAppCliente(
      telefono,
      mensajeRetencionCliente({
        nombre: cliente.nombre,
        diasDesdeUltima,
        favoritoNombre,
      }),
    );
    if (!ok) showToast?.("No se pudo abrir WhatsApp con ese teléfono");
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
