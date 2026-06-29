import { useState, useEffect } from "react";
import { reportError } from "../../utils/errorReport";
import {
  selectContactFromPhone,
  selectContactsFromPhoneMultiple,
} from "../../lib/contacts";
import { useClientes } from "../../hooks/useClientes";
import { detectAfipDocumento } from "../../lib/afipDocumento";
import { FormInput } from "../ui";

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
  confirm,
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
      setForm({ nombre: "", telefono: "", cuit: "", razon_social: "" });
    }
  }, [visible, editando]);

  if (!visible) return null;

  const normalizedTelefono = (tel) => (tel ? tel.trim() : "");

  const telefonoExiste = (tel) => {
    const t = normalizedTelefono(tel);
    if (!t) return false;
    return (clientes || []).some(
      (c) =>
        normalizedTelefono(c.telefono) === t &&
        (!isEdit || c.id !== editando.id),
    );
  };

  const resetAndClose = () => {
    onClose();
    setForm({ nombre: "", telefono: "", cuit: "", razon_social: "" });
  };

  const save = async () => {
    if (!form.nombre.trim()) return;
    const telNorm = normalizedTelefono(form.telefono);
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

  const importarVariosContactos = async () => {
    const r = await selectContactsFromPhoneMultiple();
    if (r.error === "no-support") {
      showToast("No disponible en este dispositivo");
      return;
    }
    if (r.error === "cancelled" || !r.contacts?.length) return;
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
        .map((c) => normalizedTelefono(c.telefono))
        .filter(Boolean),
    );
    const newPhones = new Set();
    for (let i = 0; i < list.length; i++) {
      const telNorm = normalizedTelefono(list[i].tel);
      if (
        telNorm &&
        (existingPhones.has(telNorm) || newPhones.has(telNorm))
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
        if (telNorm) newPhones.add(telNorm);
      } catch {
        // skip duplicate or error
      }
      setImportProgress({ done: i + 1, total: list.length });
    }
    setImportingMultiple(false);
    setImportProgress({ done: 0, total: 0 });
    showToast(`✅ ${ok} de ${list.length} cliente(s) importado(s)`);
    if (!appendCliente && onRefresh) await onRefresh();
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
        {!isEdit && (
          <div className="form-group">
              <label className="form-label">
                Tomar de contactos del celular
              </label>
              <div className="btn-group-vertical">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={async () => {
                    const r = await selectContactFromPhone();
                    if (r.error === "no-support") {
                      showToast("No disponible en este dispositivo");
                      return;
                    }
                    if (r.error === "cancelled") return;
                    setForm({ nombre: r.name, telefono: r.tel });
                  }}
                  disabled={importingMultiple}
                >
                  <span className="btn-icon-emoji">📇</span>
                  <span>Elegir contacto</span>
                </button>
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
              </div>
              {importingMultiple && importProgress.total > 0 && (
                <p className="form-hint" style={{ marginTop: 8 }}>
                  {importProgress.done} / {importProgress.total} contactos…
                </p>
              )}
              <p className="form-hint" style={{ marginTop: 6 }}>
                Funciona en Chrome Android con HTTPS. Elegí uno o varios
                contactos para crear clientes.
              </p>
            </div>
        )}
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
