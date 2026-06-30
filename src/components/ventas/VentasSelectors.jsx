import { selectContactFromPhone } from "../../lib/contacts";
import { isContactPickerAvailable } from "../../lib/contactImport";
import { SearchableCliente, SearchableSelect } from "../ui";

const MEDIOS_PAGO = [
  { value: "efectivo", label: "💵 Efectivo" },
  { value: "transferencia", label: "📱 Transferencia" },
  { value: "debito", label: "💳 Débito" },
  { value: "credito", label: "💳 Crédito" },
];

const ESTADOS_PAGO = [
  { value: "pagado", label: "✅ Pagado" },
  { value: "debe", label: "⏳ Debe" },
];

export function SelectorCliente({ value, onChange, clientes, insertCliente, showToast, required }) {
  return (
    <div className="form-group">
      <label className="form-label">
        Cliente
        {required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
      </label>
      <SearchableCliente
        value={value || ""}
        onChange={(id) => onChange(id || null)}
        clientes={clientes || []}
        insertCliente={insertCliente}
        showToast={showToast}
        placeholder="Buscar o escribir nombre…"
      />
      {isContactPickerAvailable() && (
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: 8 }}
          title="Agregar desde contactos del celular"
          onClick={() => {
            void selectContactFromPhone().then(async (r) => {
              if (r.error === "no-support") {
                showToast(r.message || "No disponible en este dispositivo");
                return;
              }
              if (r.error === "cancelled") return;
              if (r.error === "empty" || r.error === "failed") {
                showToast(r.message || "No se pudo abrir contactos");
                return;
              }
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
            });
          }}
        >
          📇 Elegir contacto
        </button>
      )}
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
        <SearchableSelect
          options={MEDIOS_PAGO}
          value={medioPago}
          onChange={setMedioPago}
          placeholder="Seleccionar medio"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Estado</label>
        <SearchableSelect
          options={ESTADOS_PAGO}
          value={estadoPago}
          onChange={setEstadoPago}
          placeholder="Seleccionar estado"
        />
      </div>
    </div>
  );
}
