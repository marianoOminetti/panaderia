/**
 * Asistentes para masas: extraer masa, porciones y nueva variante.
 */
import { useState } from "react";
import { FormInput } from "../ui";
import {
  buildExtraerMasa,
  buildPorcionesMasa,
  buildVarianteDesdeProducto,
  ingredientesExtraibles,
  sumGramosIngredientes,
} from "../../lib/recetaMasas";
import { TIPO_RECETA } from "../../lib/recetaTipo";

function WizardOverlay({ title, children, onClose, onConfirm, confirmLabel, confirmDisabled }) {
  return (
    <div className="receta-wizard-overlay">
      <div className="receta-wizard">
        <div className="receta-wizard-header">
          <span className="receta-wizard-title">{title}</span>
          <button type="button" className="plan-dia-picker-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="receta-wizard-body">{children}</div>
        <div className="receta-wizard-actions">
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function WizardExtraerMasa({ form, ingredientes, onClose, onApply, saving }) {
  const extraibles = ingredientesExtraibles(ingredientes);
  const [seleccionados, setSeleccionados] = useState(() => new Set(extraibles.map(({ idx }) => idx)));
  const [nombreMasa, setNombreMasa] = useState(() => {
    const base = (form.nombre || "").replace(/^copia de\s+/i, "").trim();
    return base ? `Masa ${base}` : "Masa";
  });
  const [familia, setFamilia] = useState(form.familia || "");
  const [gramos, setGramos] = useState(() => {
    const idxs = extraibles.map(({ idx }) => idx);
    const g = sumGramosIngredientes(ingredientes, idxs);
    return g > 0 ? String(Math.round(g)) : "";
  });

  const toggle = (idx) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const confirm = () => {
    if (!seleccionados.size) return;
    const result = buildExtraerMasa({
      productoForm: form,
      ingredientes,
      indicesMasa: [...seleccionados],
      nombreMasa,
      familia,
      gramosPorUnidadProducto: gramos,
    });
    onApply(result);
  };

  if (!extraibles.length) {
    return (
      <WizardOverlay
        title="Extraer masa"
        onClose={onClose}
        onConfirm={onClose}
        confirmLabel="Entendido"
        confirmDisabled={false}
      >
        <p className="form-hint">
          Esta receta no tiene insumos directos para separar. Agregá ingredientes de insumo primero.
        </p>
      </WizardOverlay>
    );
  }

  return (
    <WizardOverlay
      title="Extraer masa del producto"
      onClose={onClose}
      onConfirm={confirm}
      confirmLabel={saving ? "Creando…" : "Crear masa y vincular"}
      confirmDisabled={saving || !seleccionados.size || !nombreMasa.trim()}
    >
      <p className="form-hint">
        Elegí qué ingredientes van a la masa base. El producto quedará usando esa masa en gramos.
      </p>
      {extraibles.map(({ ing, idx }) => (
        <label key={idx} className="receta-wizard-check">
          <input
            type="checkbox"
            checked={seleccionados.has(idx)}
            onChange={() => toggle(idx)}
          />
          <span>
            {ing.cantidad} {ing.unidad || "g"} (insumo)
          </span>
        </label>
      ))}
      <FormInput label="Nombre de la masa" value={nombreMasa} onChange={setNombreMasa} placeholder="Masa Brownie" />
      <FormInput label="Familia" value={familia} onChange={setFamilia} placeholder="Brownie" />
      <FormInput
        label="Gramos de masa por unidad de producto"
        type="number"
        min={1}
        value={gramos}
        onChange={setGramos}
        placeholder="Ej: 80"
      />
    </WizardOverlay>
  );
}

export function WizardPorciones({ masaBase, onClose, onCreatePorciones, saving }) {
  const [texto, setTexto] = useState("45, 55");

  const confirm = () => {
    const gramosList = texto
      .split(/[,;\s]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((g) => Number.isFinite(g) && g > 0);
    if (!gramosList.length) return;
    const payloads = buildPorcionesMasa({ masaBase, gramosList });
    onCreatePorciones(payloads);
  };

  return (
    <WizardOverlay
      title="Porciones de masa"
      onClose={onClose}
      onConfirm={confirm}
      confirmLabel={saving ? "Creando…" : "Crear porciones"}
      confirmDisabled={saving || !texto.trim()}
    >
      <p className="form-hint">
        Desde <strong>{masaBase.nombre}</strong>, creá masas porcionadas que usan la base como ingrediente.
      </p>
      <FormInput
        label="Gramos por porción (separados por coma)"
        value={texto}
        onChange={setTexto}
        placeholder="45, 55"
      />
    </WizardOverlay>
  );
}

export function WizardVariante({ producto, ingredientes, onClose, onApply }) {
  const [nombre, setNombre] = useState("");
  const [familia, setFamilia] = useState(producto.familia || "");

  return (
    <WizardOverlay
      title="Nueva variante"
      onClose={onClose}
      onConfirm={() => {
        if (!nombre.trim()) return;
        onApply(buildVarianteDesdeProducto({ producto, ingredientes, nuevoNombre: nombre, familia }));
      }}
      confirmLabel="Crear variante en el formulario"
      confirmDisabled={!nombre.trim()}
    >
      <p className="form-hint">
        Copiá la estructura de <strong>{producto.nombre}</strong> (masa + extras) para otra variante de venta.
      </p>
      <FormInput label="Nombre de la variante" value={nombre} onChange={setNombre} placeholder="Brownie frutos rojos" />
      <FormInput label="Familia" value={familia} onChange={setFamilia} placeholder="Brownie" />
    </WizardOverlay>
  );
}

export function getMasasBaseOptions(recetas) {
  return (recetas || []).filter((r) => r.es_precursora);
}

export { TIPO_RECETA };
