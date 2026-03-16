/**
 * Contact Picker API: selección de contactos del teléfono (nombre, tel) para Clientes.
 * Chrome Android con HTTPS. Usado por ClienteFormModal o búsqueda de clientes.
 */
/** Contact Picker API - selecciona un contacto del celular (Chrome Android con HTTPS) */
export async function selectContactFromPhone() {
  if (!navigator.contacts?.select) return { error: "no-support" };
  try {
    const props = ["name", "tel"];
    const contacts = await navigator.contacts.select(props, {
      multiple: false,
    });
    if (!contacts?.length) return { error: "cancelled" };
    const c = contacts[0];
    const name = c.name?.[0] ?? "";
    const tel = c.tel?.[0] ?? "";
    return { name, tel };
  } catch {
    return { error: "cancelled" };
  }
}

/** Contact Picker API - selecciona varios contactos del celular (Chrome Android con HTTPS) */
export async function selectContactsFromPhoneMultiple() {
  if (!navigator.contacts?.select)
    return { error: "no-support", contacts: [] };
  try {
    const props = ["name", "tel"];
    const contacts = await navigator.contacts.select(props, {
      multiple: true,
    });
    if (!contacts?.length) return { error: "cancelled", contacts: [] };
    return {
      contacts: contacts
        .map((c) => ({
          name: (c.name?.[0] ?? "").trim(),
          tel: (c.tel?.[0] ?? "").trim(),
        }))
        .filter((c) => c.name || c.tel),
    };
  } catch {
    return { error: "cancelled", contacts: [] };
  }
}

