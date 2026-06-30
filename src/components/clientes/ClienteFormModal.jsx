import { useState, useEffect } from "react";
import { reportError } from "../../utils/errorReport";
import {
  selectContactFromPhone,
  selectContactsFromPhoneMultiple,
} from "../../lib/contacts";
import {
  isContactPickerAvailable,
  shouldShowVCardImport,
  findClienteByTelefono,
  telefonosEquivalentes,
  normalizeTelefonoForDedup,
} from "../../lib/contactImport";
import { useClientes } from "../../hooks/useClientes";
import { detectAfipDocumento } from "../../lib/afipDocumento";
import { FormInput } from "../ui";
import ContactImportIOS from "./ContactImportIOS";

function ClienteFormModal({
  visible,
  onClose,
  clientes,
  onRefresh,
  appendCliente,
  updateClienteInState,
  showToast,
  editando = null,
  onSaved,
  onExistingCliente,
  confirm,
  initialNombre = "",
  initialTelefono = "",
}) {
  const { insertCliente, updateCliente } = useClientes({
    onRefresh,
    appendCliente,
    updateClienteInState,
    showToast,
  });

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    cuit: "",
    razon_social: "",
  });
  const [saving, setSaving] = useState(false);
  const [importingMultiple, setImportingMultiple] = useState(false);
  const [importProgress, setImportProgress] = useState({
    done: 0,
    total: 0,
  });

  const isEdit = !!editando;

  useEffect(() => {
    if (!visible) return;
    if (editando) {
      setForm({
        nombre: editando.nombre || "",
        telefono: editando.telefono || "",
        cuit: editando.cuit || editando.dni || "",
        razon_social: editando.razon_social || "",
      });
    } else {
      setForm({
        nombre: initialNombre || "",
        telefono: initialTelefono || "",
        cuit: "",
        razon_social: "",
      });
    }
  }, [visible, editando, initialNombre, initialTelefono]);

  if (!visible) return null;

  const normalizedTelefono = (tel) => (tel ? tel.trim() : "");

  const telefonoExiste = (tel) => {
    const t = normalizedTelefono(tel);
    if (!t) return false;
    return (clientes || []).some(
      (c) =>
        telefonosEquivalentes(c.telefono, t) &&
        (!isEdit || c.id !== editando.id),
    );
  };

  const clienteExistentePorTel = (tel) => {
    if (isEdit) return null;
    return findClienteByTelefono(clientes, tel);
  };

  const resetAndClose = () => {
    onClose();
    setForm({ nombre: "", telefono: "", cuit: "", razon_social: "" });
  };

  const save = async () => {
    if (!form.nombre.trim()) return;
    const telNorm = normalizedTelefono(form.telefono);
    const existing = telNorm ? clienteExistentePorTel(telNorm) : null;
    if (existing) {
      showToast(`Ya está cargado: ${existing.nombre}`);
      onExistingCliente?.(existing);
      resetAndClose();
      return;
    }
    if (telNorm && telefonoExiste(telNorm)) {
      showToast("Ya existe un cliente con ese teléfono");
      return;
    }
    if (
      isEdit &&
      editando.telefono?.trim() &&
      !telNorm &&
      confirm
    ) {
      const ok = await confirm(
        "¿Quitar el teléfono de este cliente? No vas a poder enviarle WhatsApp desde la app.",
        { destructive: true },
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const docRaw = form.cuit.replace(/\D/g, "").slice(0, 11);
        const doc = detectAfipDocumento(docRaw);
        if (!doc.ok && docRaw.length > 0) {
          showToast(doc.error);
          setSaving(false);
          return;
        }
        const updated = await updateCliente(editando.id, {
          nombre: form.nombre.trim(),
          telefono: telNorm || null,
          cuit: doc.ok && doc.cuit ? doc.cuit : null,
          dni: doc.ok && doc.dni ? doc.dni : null,
          razon_social: form.razon_social.trim() || null,
        });
        onSaved?.(updated);
        resetAndClose();
        return;
      }
      const docRaw = form.cuit.replace(/\D/g, "").slice(0, 11);
      const doc = detectAfipDocumento(docRaw);
      if (!doc.ok && docRaw.length > 0) {
        showToast(doc.error);
        setSaving(false);
        return;
      }
      await insertCliente({
        nombre: form.nombre.trim(),
        telefono: telNorm || null,
        cuit: doc.ok && doc.cuit ? doc.cuit : null,
        dni: doc.ok && doc.dni ? doc.dni : null,
        razon_social: form.razon_social.trim() || null,
      });
      resetAndClose();
    } catch (error) {
      reportError(error, {
        action: isEdit ? "updateCliente" : "saveCliente",
        form: { ...form },
      });
      showToast(
        `⚠️ Error al guardar: ${(error.message || "").slice(0, 50)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const importarVariosContactos = () => {
    void selectContactsFromPhoneMultiple().then(async (r) => {
      if (r.error === "no-support") {
        showToast(r.message || "No disponible — importá de a uno con Pegar vCard");
        return;
      }
      if (r.error === "cancelled") return;
      if (r.error === "empty" || r.error === "failed") {
        showToast(r.message || "No se pudieron abrir contactos");
        return;
      }
      if (!r.contacts?.length) return;
    const list = r.contacts.filter((c) => c.name || c.tel);
    if (list.length === 0) {
      showToast("No hay contactos con nombre o teléfono");
      return;
    }
    setImportingMultiple(true);
    setImportProgress({ done: 0, total: list.length });
    let ok = 0;
    const existingPhones = new Set(
      (clientes || [])
        .map((c) => normalizeTelefonoForDedup(c.telefono))
        .filter(Boolean),
    );
    const newPhones = new Set();
    for (let i = 0; i < list.length; i++) {
      const telNorm = normalizedTelefono(list[i].tel);
      const telKey = normalizeTelefonoForDedup(list[i].tel);
      if (
        telKey &&
        (existingPhones.has(telKey) || newPhones.has(telKey))
      ) {
        setImportProgress({ done: i + 1, total: list.length });
        continue;
      }
      try {
        await insertCliente(
          {
            nombre: list[i].name || "Sin nombre",
            telefono: telNorm || null,
          },
          { skipToast: true, skipRefresh: true },
        );
        ok++;
        if (telKey) newPhones.add(telKey);
      } catch {
        // skip duplicate or error
      }
      setImportProgress({ done: i + 1, total: list.length });
    }
    setImportingMultiple(false);
    setImportProgress({ done: 0, total: 0 });
    showToast(`✅ ${ok} de ${list.length} cliente(s) importado(s)`);
    if (!appendCliente && onRefresh) await onRefresh();
    });
  };

  const handleContactImport = ({ nombre, telefono }) => {
    setForm((prev) => ({
      ...prev,
      nombre: nombre || prev.nombre,
      telefono: telefono || prev.telefono,
    }));
  };

  const handleImportedExistingCliente = (cliente) => {
    if (isEdit) {
      showToast(`Ese teléfono ya es de ${cliente.nombre}`);
      return;
    }
    showToast(`Ya está cargado: ${cliente.nombre}`);
    onExistingCliente?.(cliente);
    resetAndClose();
  };

  const pickContactFromPhone = () => {
    void selectContactFromPhone().then((r) => {
      if (r.error === "no-support") {
        showToast(r.message || "No disponible en este dispositivo — usá Pegar vCard");
        return;
      }
      if (r.error === "cancelled") return;
      if (r.error === "empty" || r.error === "failed") {
        showToast(r.message || "No se pudo abrir contactos — usá Pegar vCard");
        return;
      }
      const existing = r.tel ? findClienteByTelefono(clientes, r.tel) : null;
      if (existing && (!isEdit || existing.id !== editando.id)) {
        handleImportedExistingCliente(existing);
        return;
      }
      handleContactImport({ nombre: r.name, telefono: r.tel });
    });
  };

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={resetAndClose} disabled={saving}>
          ← Volver
        </button>
        <span className="screen-title">
          {isEdit ? "Editar cliente" : "Nuevo cliente"}
        </span>
      </div>
      <div className="screen-content">
        <FormInput
          label="Nombre"
          value={form.nombre}
          onChange={(v) => setForm({ ...form, nombre: v })}
          placeholder="Ej: María García"
          required
          autoFocus
        />
        <FormInput
          label="Teléfono"
          type="tel"
          value={form.telefono}
          onChange={(v) => setForm({ ...form, telefono: v })}
          placeholder="+54 11 1234-5678"
        />
        <FormInput
          label="Razón social (opcional, factura AFIP)"
          value={form.razon_social}
          onChange={(v) => setForm({ ...form, razon_social: v })}
          placeholder="Como figura en AFIP"
        />
        <FormInput
          label="CUIT o DNI (opcional)"
          value={form.cuit}
          onChange={(v) =>
            setForm({ ...form, cuit: v.replace(/\D/g, "").slice(0, 11) })
          }
          placeholder="11 CUIT o 7–8 DNI"
          inputMode="numeric"
        />
        <div className="form-group">
          <label className="form-label">
            {isEdit
              ? "Actualizar desde contactos del celular"
              : "Tomar de contactos del celular"}
          </label>
          {isContactPickerAvailable() && (
            <>
              <div className="btn-group-vertical">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={pickContactFromPhone}
                  disabled={importingMultiple}
                >
                  <span className="btn-icon-emoji">📇</span>
                  <span>Elegir contacto</span>
                </button>
                {!isEdit && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={importarVariosContactos}
                    disabled={importingMultiple}
                  >
                    <span className="btn-icon-emoji">📋</span>
                    <span>
                      {importingMultiple ? "Importando…" : "Importar varios"}
                    </span>
                  </button>
                )}
              </div>
              {importingMultiple && importProgress.total > 0 && (
                <p className="form-hint" style={{ marginTop: 8 }}>
                  {importProgress.done} / {importProgress.total} contactos…
                </p>
              )}
              <p className="form-hint" style={{ marginTop: 6 }}>
                {isEdit
                  ? "Chrome Android con HTTPS. Si no abre la agenda, usá Pegar vCard abajo."
                  : "Chrome Android con HTTPS. Si no abre, pegá vCard de a uno abajo."}
              </p>
            </>
          )}
          {shouldShowVCardImport() && (
            <ContactImportIOS
              clientes={clientes}
              showToast={showToast}
              onImport={handleContactImport}
              onExistingCliente={handleImportedExistingCliente}
              excludeClienteId={isEdit ? editando.id : null}
              compact={isContactPickerAvailable()}
            />
          )}
        </div>
        {isEdit && (
          <p className="form-hint" style={{ marginBottom: 12 }}>
            Las facturas AFIP ya emitidas conservan los datos que tenían al
            momento del cobro.
          </p>
        )}
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving || !form.nombre.trim()}
        >
          {saving
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Agregar cliente"}
        </button>
      </div>
    </div>
  );
}

export default ClienteFormModal;
