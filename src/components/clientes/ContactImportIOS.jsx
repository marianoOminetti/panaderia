import { useState, useMemo, useCallback } from "react";
import {
  parsePastedVCard,
  isVCardText,
  findClienteByTelefono,
  isClipboardApiAvailable,
} from "../../lib/contactImport";

/**
 * iOS: pegar un contacto copiado como vCard desde la app Contactos.
 */
export default function ContactImportIOS({
  onImport,
  onExistingCliente,
  clientes = [],
  showToast,
  excludeClienteId = null,
}) {
  const [manualVCard, setManualVCard] = useState("");
  const clipboardOk = useMemo(() => isClipboardApiAvailable(), []);

  const applyContact = useCallback(
    (data) => {
      if (!data) return;
      const telefono = data.telefono?.trim() || "";
      const nombre = data.nombre?.trim() || "";
      if (!nombre && !telefono) return;

      const existing = telefono ? findClienteByTelefono(clientes, telefono) : null;
      if (existing) {
        if (excludeClienteId && existing.id === excludeClienteId) {
          onImport({ nombre, telefono });
          setManualVCard("");
          showToast?.("Contacto cargado");
          return;
        }
        showToast?.(`Ya está cargado: ${existing.nombre}`);
        onExistingCliente?.(existing);
        return;
      }

      onImport({ nombre, telefono });
      setManualVCard("");
      showToast?.("Contacto cargado");
    },
    [clientes, excludeClienteId, onExistingCliente, onImport, showToast],
  );

  const parseAndApply = useCallback(
    (text) => {
      if (!text?.trim()) {
        showToast?.("Pegá un contacto en formato vCard");
        return;
      }
      if (!isVCardText(text)) {
        showToast?.("No es vCard — copiá el contacto desde Contactos (Compartir → Copiar)");
        return;
      }
      const parsed = parsePastedVCard(text);
      if (!parsed) {
        showToast?.("No se pudo leer el vCard (falta nombre o teléfono)");
        return;
      }
      applyContact(parsed);
    },
    [applyContact, showToast],
  );

  const readClipboard = useCallback(async () => {
    if (!clipboardOk) return;
    try {
      const text = await navigator.clipboard.readText();
      parseAndApply(text);
    } catch {
      showToast?.("No se pudo leer el portapapeles — pegá el vCard en el cuadro de abajo");
    }
  }, [clipboardOk, parseAndApply, showToast]);

  return (
    <div className="contact-import-ios">
      <p className="form-hint" style={{ marginBottom: 8 }}>
        En <strong>Contactos</strong>: elegí el contacto → <strong>Compartir contacto</strong>{" "}
        → <strong>Copiar</strong>. Después tocá <strong>Pegar vCard</strong> o pegá el texto abajo.
      </p>
      {clipboardOk && (
        <button type="button" className="btn-icon" onClick={readClipboard}>
          <span className="btn-icon-emoji">📋</span>
          <span>Pegar vCard</span>
        </button>
      )}
      <label className="contact-import-vcard-field">
        <span className="contact-import-vcard-label">vCard (pegar acá si hace falta)</span>
        <textarea
          className="contact-import-vcard-textarea"
          value={manualVCard}
          onChange={(e) => setManualVCard(e.target.value)}
          placeholder={"BEGIN:VCARD\nFN:…\nTEL:…\nEND:VCARD"}
          rows={4}
        />
      </label>
      {manualVCard.trim() && (
        <button
          type="button"
          className="edit-btn"
          style={{ marginTop: 8 }}
          onClick={() => parseAndApply(manualVCard)}
        >
          Usar vCard pegado
        </button>
      )}
      {!clipboardOk && (
        <p className="contact-import-ios-warn" role="status">
          En red local (<strong>http</strong>) pegá el vCard en el cuadro y tocá{" "}
          <strong>Usar vCard pegado</strong>.
        </p>
      )}
    </div>
  );
}
