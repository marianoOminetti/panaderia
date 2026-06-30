/**
 * Contact Picker API: selección de contactos del teléfono (nombre, tel) para Clientes.
 * Chrome Android con HTTPS. Usado por ClienteFormModal o búsqueda de clientes.
 */

function mapContactPickerError(err) {
  const name = err?.name || "";
  if (name === "AbortError" || name === "NotAllowedError") {
    return { error: "cancelled" };
  }
  if (name === "InvalidStateError" || name === "SecurityError") {
    return {
      error: "failed",
      message: "No se pudo abrir contactos (probá Pegar vCard abajo)",
    };
  }
  return {
    error: "failed",
    message: err?.message || "No se pudo abrir contactos — probá Pegar vCard",
  };
}

/** Contact Picker API - selecciona un contacto del celular (Chrome Android con HTTPS) */
export async function selectContactFromPhone() {
  if (!navigator.contacts?.select) return { error: "no-support" };
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { error: "no-support", message: "Requiere HTTPS" };
  }
  try {
    const props = ["name", "tel"];
    const contacts = await navigator.contacts.select(props, {
      multiple: false,
    });
    if (!contacts?.length) {
      return {
        error: "empty",
        message: "No se obtuvo contacto — si no se abrió la agenda, usá Pegar vCard",
      };
    }
    const c = contacts[0];
    const name = c.name?.[0] ?? "";
    const tel = c.tel?.[0] ?? "";
    return { name, tel };
  } catch (err) {
    return mapContactPickerError(err);
  }
}

/** Contact Picker API - selecciona varios contactos del celular (Chrome Android con HTTPS) */
export async function selectContactsFromPhoneMultiple() {
  if (!navigator.contacts?.select) {
    return { error: "no-support", contacts: [] };
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { error: "no-support", contacts: [], message: "Requiere HTTPS" };
  }
  try {
    const props = ["name", "tel"];
    const contacts = await navigator.contacts.select(props, {
      multiple: true,
    });
    if (!contacts?.length) {
      return {
        error: "empty",
        contacts: [],
        message: "No se obtuvieron contactos — probá Pegar vCard de a uno",
      };
    }
    return {
      contacts: contacts
        .map((c) => ({
          name: (c.name?.[0] ?? "").trim(),
          tel: (c.tel?.[0] ?? "").trim(),
        }))
        .filter((c) => c.name || c.tel),
    };
  } catch (err) {
    return { ...mapContactPickerError(err), contacts: [] };
  }
}
