import { selectContactFromPhone } from "../../lib/contacts";

export function SelectorCliente({ value, onChange, clientes, insertCliente, showToast }) {
  return (
    <div className="form-group">
      <label className="form-label">Cliente</label>
      <select
        className="form-input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      >
        <option value="">— Sin cliente</option>
        {(clientes || []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.telefono ? ` · ${c.telefono}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-secondary"
        style={{ marginTop: 8 }}
        title="Agregar desde contactos del celular"
        onClick={async () => {
          const r = await selectContactFromPhone();
          if (r.error === "no-support") {
            showToast("No disponible en este dispositivo");
            return;
          }
          if (r.error === "cancelled") return;
          if (!r.name?.trim()) return;
          const telNorm = r.tel?.trim() || "";
          if (
            telNorm &&
            (clientes || []).some((c) => (c.telefono || "").trim() === telNorm)
          ) {
            showToast("Ya existe un cliente con ese teléfono");
            return;
          }
          try {
            const data = await insertCliente(
              { nombre: r.name.trim(), telefono: telNorm || null },
              { skipToast: true },
            );
            if (data) {
              onChange(data.id);
              showToast(`✅ Cliente ${r.name} agregado`);
            }
          } catch {
            showToast("⚠️ Error al agregar cliente");
          }
        }}
      >
        📇 Elegir contacto
      </button>
    </div>
  );
}

export function SelectoresPago({ medioPago, setMedioPago, estadoPago, setEstadoPago }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div className="form-group">
        <label className="form-label">Medio</label>
        <select
          className="form-input"
          value={medioPago}
          onChange={(e) => setMedioPago(e.target.value)}
        >
          <option value="efectivo">💵 Efectivo</option>
          <option value="transferencia">📱 Transferencia</option>
          <option value="debito">💳 Débito</option>
          <option value="credito">💳 Crédito</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Estado</label>
        <select
          className="form-input"
          value={estadoPago}
          onChange={(e) => setEstadoPago(e.target.value)}
        >
          <option value="pagado">✅ Pagado</option>
          <option value="debe">⏳ Debe</option>
        </select>
      </div>
    </div>
  );
}
