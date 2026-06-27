/**
 * Pantalla Gastos: resumen KPI, lista filtrable y formulario.
 * Soporta tipo fijo, variable y puntual.
 */
import { useState, useMemo, useCallback } from "react";
import { fmt } from "../../lib/format";
import { reportError } from "../../utils/errorReport";
import {
  calcularGastosTotales,
  getSemanaActualBounds,
  gastoEnSemana,
} from "../../lib/gastosFijos";
import { useGastosFijos as useGastosFijosMutations } from "../../hooks/useGastosFijos";
import { useGastosFijosForm } from "../../hooks/useGastosFijosForm";
import { FormInput, FormMoneyInput, SearchableSelect, DatePicker } from "../ui";

const TIPO_LABEL = { fijo: "Fijo", variable: "Variable", puntual: "Puntual" };

const TIPOS_GASTO = [
  { value: "fijo", label: "Fijo (recurrente)" },
  { value: "variable", label: "Variable (facturas)" },
  { value: "puntual", label: "Puntual (una vez)" },
];

const FRECUENCIAS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
];

const FILTROS_TIPO = ["Todos", "Fijo", "Variable", "Puntual"];

const GRUPOS_TIPO = [
  { key: "fijo", label: "Fijos recurrentes" },
  { key: "variable", label: "Variables" },
  { key: "puntual", label: "Puntuales" },
];

const TIPO_COLORS = {
  fijo: "var(--purple)",
  variable: "#E8A317",
  puntual: "#6B9080",
};

const CHECKLIST_DEFAULT = ["Luz", "Gas", "Delivery"];
const CHECKLIST_STORAGE_KEY = "gastos.cierreChecklist";

const formatFecha = (fecha) => {
  if (!fecha) return "";
  const d = new Date(fecha);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

const getTipo = (g) => (g.tipo || "fijo").toLowerCase();

const vencePronto = (g) => {
  if (!g.fecha_fin_vigencia) return false;
  const fin = new Date(g.fecha_fin_vigencia);
  if (Number.isNaN(fin.getTime())) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 30);
  return fin.getTime() > hoy.getTime() && fin.getTime() <= limite.getTime();
};

const sortGastos = (items, porMonto) => {
  const sorted = [...items];
  if (porMonto) {
    sorted.sort((a, b) => (Number(b.monto) || 0) - (Number(a.monto) || 0));
    return sorted;
  }
  sorted.sort((a, b) => {
    const orderTipo = { fijo: 0, variable: 1, puntual: 2 };
    const ta = orderTipo[getTipo(a)] ?? 0;
    const tb = orderTipo[getTipo(b)] ?? 0;
    if (ta !== tb) return ta - tb;
    const cmp = (a.nombre || "").localeCompare(b.nombre || "", "es", {
      sensitivity: "base",
    });
    if (cmp !== 0) return cmp;
    const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
    const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return fb - fa;
  });
  return sorted;
};

const renderDetalleFila = (g) => {
  const tipo = getTipo(g);
  if (tipo === "fijo") {
    const freqLabel =
      g.frecuencia === "diario"
        ? "Diario"
        : g.frecuencia === "semanal"
          ? "Semanal"
          : "Mensual";
    const inicio = g.fecha_inicio_vigencia
      ? formatFecha(g.fecha_inicio_vigencia)
      : null;
    const fin = g.fecha_fin_vigencia ? formatFecha(g.fecha_fin_vigencia) : null;
    const partes = [
      <span key="tipo" className="chip">
        {TIPO_LABEL.fijo}
      </span>,
      freqLabel,
    ];
    if (inicio) partes.push(`Desde ${inicio}`);
    if (fin) partes.push(`Hasta ${fin}`);
    return partes.reduce((acc, part, i) => {
      if (i === 0) return [part];
      return [...acc, " · ", part];
    }, []);
  }
  return [
    <span key="tipo" className="chip">
      {TIPO_LABEL[tipo] || tipo}
    </span>,
    " · ",
    formatFecha(g.fecha),
  ];
};

function GastoRow({ g, historico = false, onEdit }) {
  const tipo = getTipo(g);
  const pronto = vencePronto(g);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(g);
    }
  };

  return (
    <div
      className={`insumo-item gasto-item${historico ? " gasto-item--historico" : ""}`}
      onClick={() => onEdit(g)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div
        className="insumo-dot"
        style={{ background: TIPO_COLORS[tipo] || "#ccc" }}
      />
      <div className="insumo-info" style={{ flex: 1, minWidth: 0 }}>
        <div className="insumo-nombre">
          {g.nombre}
          {pronto && (
            <span className="gasto-badge-vence">Vence pronto</span>
          )}
        </div>
        <div className="insumo-detalle">{renderDetalleFila(g)}</div>
      </div>
      <div className="insumo-precio" style={{ marginLeft: 8 }}>
        <div className="insumo-precio-value">{fmt(g.monto)}</div>
      </div>
    </div>
  );
}

function GastosResumen({
  dia,
  semana,
  mes,
  desglose,
  onAbrirAnalytics,
}) {
  const diff =
    desglose?.semanaAnterior != null
      ? semana - desglose.semanaAnterior
      : null;
  const diffLabel =
    diff == null
      ? null
      : diff === 0
        ? "igual que la semana pasada"
        : diff > 0
          ? `+${fmt(diff)} vs sem. ant.`
          : `${fmt(diff)} vs sem. ant.`;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Resumen</span>
      </div>
      <div className="card-content">
        <div className="receta-stats">
          <div className="receta-stat">
            <div className="receta-stat-label">Diario</div>
            <div className="receta-stat-value">{fmt(dia || 0)}</div>
          </div>
          <button
            type="button"
            className="receta-stat gasto-kpi-btn"
            onClick={() => onAbrirAnalytics?.("detalle-semana")}
            disabled={!onAbrirAnalytics}
            title={onAbrirAnalytics ? "Ver en Analytics" : undefined}
          >
            <div className="receta-stat-label">Esta semana</div>
            <div className="receta-stat-value">{fmt(semana || 0)}</div>
            {diffLabel && (
              <div className="analytics-kpi-sub" style={{ marginTop: 4 }}>
                {diffLabel}
              </div>
            )}
          </button>
          <button
            type="button"
            className="receta-stat gasto-kpi-btn"
            onClick={() => onAbrirAnalytics?.("detalle-mes")}
            disabled={!onAbrirAnalytics}
            title={onAbrirAnalytics ? "Ver en Analytics" : undefined}
          >
            <div className="receta-stat-label">Este mes</div>
            <div className="receta-stat-value">{fmt(mes || 0)}</div>
          </button>
        </div>
        {desglose && (
          <p className="analytics-kpi-sub" style={{ marginTop: 10 }}>
            Fijos esta semana: {fmt(desglose.semanaFijos || 0)} · Extras:{" "}
            {fmt(desglose.semanaExtras || 0)}
          </p>
        )}
        <p className="analytics-kpi-sub" style={{ marginTop: 4 }}>
          Costo fijo prorrateado · fijos + variable/puntual del período
        </p>
      </div>
    </div>
  );
}

function GastosCierreChecklist({ items, weekKey, checked, onToggle }) {
  if (!items.length) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Checklist de cierre</span>
      </div>
      <div className="card-content">
        <p className="analytics-kpi-sub" style={{ marginBottom: 10 }}>
          Marcá lo que ya cargaste esta semana
        </p>
        {items.map((nombre) => {
          const key = `${weekKey}:${nombre}`;
          const done = !!checked[key];
          return (
            <label key={nombre} className="gasto-checklist-item">
              <input
                type="checkbox"
                checked={done}
                onChange={() => onToggle(key)}
              />
              <span className={done ? "gasto-checklist-done" : undefined}>
                {nombre}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function GastosFijos({
  gastos,
  onRefresh,
  appendGasto,
  updateGastoInState,
  removeGasto,
  showToast,
  onAbrirAnalytics,
}) {
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteMode, setDeleteMode] = useState("solo-futuro");
  const [deleteDesde, setDeleteDesde] = useState("");
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const [soloSemanaActual, setSoloSemanaActual] = useState(false);
  const [ordenMonto, setOrdenMonto] = useState(false);
  const [showHistoricos, setShowHistoricos] = useState(false);
  const [checklistChecked, setChecklistChecked] = useState(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const {
    saveGastoFijo,
    deleteGastoFijo,
  } = useGastosFijosMutations({
    onRefresh,
    showToast,
    appendGasto,
    updateGastoInState,
    removeGasto,
  });

  const formState = useGastosFijosForm({ showToast, saveGastoFijo });

  const ahora = new Date();
  const { weekStart, weekEnd } = getSemanaActualBounds(ahora);
  const weekKey = weekStart.toISOString().slice(0, 10);

  const totales = calcularGastosTotales(gastos, ahora);
  const { dia, semana, mes, desglose } = totales;

  const gastosOrdenados = useMemo(
    () => sortGastos(gastos || [], ordenMonto),
    [gastos, ordenMonto]
  );

  const gastosVigentes = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return gastosOrdenados.filter((g) => {
      if (!g.fecha_fin_vigencia) return true;
      const fin = new Date(g.fecha_fin_vigencia);
      if (Number.isNaN(fin.getTime())) return true;
      return fin.getTime() > hoy.getTime();
    });
  }, [gastosOrdenados]);

  const gastosHistoricos = useMemo(
    () => gastosOrdenados.filter((g) => !gastosVigentes.includes(g)),
    [gastosOrdenados, gastosVigentes]
  );

  const filtrarLista = useCallback(
    (lista) => {
      const q = search.trim().toLowerCase();
      return lista.filter((g) => {
        const tipo = getTipo(g);
        if (tipoFiltro !== "Todos" && tipo !== tipoFiltro.toLowerCase()) {
          return false;
        }
        if (soloSemanaActual && (tipo === "variable" || tipo === "puntual")) {
          if (!gastoEnSemana(g, weekStart, weekEnd)) return false;
        }
        if (q && !(g.nombre || "").toLowerCase().includes(q)) return false;
        return true;
      });
    },
    [search, tipoFiltro, soloSemanaActual, weekStart, weekEnd]
  );

  const vigentesFiltrados = useMemo(
    () => filtrarLista(gastosVigentes),
    [filtrarLista, gastosVigentes]
  );

  const subtotalGrupo = useCallback(
    (tipoKey) => {
      if (tipoKey === "fijo") return desglose?.semanaFijos || 0;
      const items = gastosVigentes.filter((g) => {
        if (getTipo(g) !== tipoKey) return false;
        if (tipoKey === "variable" || tipoKey === "puntual") {
          return gastoEnSemana(g, weekStart, weekEnd);
        }
        return true;
      });
      return items.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    },
    [desglose, gastosVigentes, weekStart, weekEnd]
  );

  const checklistItems = useMemo(() => {
    const nombres = new Set(CHECKLIST_DEFAULT);
    for (const g of gastos || []) {
      if (getTipo(g) === "variable" && g.nombre) {
        nombres.add(g.nombre.trim());
      }
    }
    return Array.from(nombres).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [gastos]);

  const toggleChecklist = useCallback((key) => {
    setChecklistChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const eliminar = (g) => {
    formState.closeModal();
    setDeleteModal(g);
    setDeleteMode("solo-futuro");
    setDeleteDesde("");
  };

  const confirmarEliminacion = async () => {
    if (!deleteModal) return;
    try {
      await deleteGastoFijo(deleteModal, {
        mode: deleteMode,
        desde: deleteDesde || null,
      });
      setDeleteModal(null);
    } catch (err) {
      reportError(err, { action: "deleteGastoFijo", id: deleteModal.id });
      showToast("⚠️ Error al eliminar gasto");
    }
  };

  const aplicarFacturasSemana = () => {
    setTipoFiltro("Variable");
    setSoloSemanaActual(true);
    setSearch("");
  };

  const renderGrupo = (grupoKey, items) => {
    if (!items.length) return null;
    const label = GRUPOS_TIPO.find((g) => g.key === grupoKey)?.label || grupoKey;
    const sub = subtotalGrupo(grupoKey);
    return (
      <div key={grupoKey} className="gasto-grupo">
        <div className="gasto-grupo-header">
          <span className="insights-section-title">{label}</span>
          <span className="gasto-grupo-subtotal">
            {fmt(sub)} esta semana
          </span>
        </div>
        {items.map((g) => (
          <GastoRow key={g.id} g={g} onEdit={formState.openEdit} />
        ))}
      </div>
    );
  };

  const renderListaVigentes = () => {
    if (gastosVigentes.length === 0) {
      return (
        <div className="empty">
          <div className="empty-icon">💸</div>
          <p>No configuraste gastos todavía.</p>
          <p className="analytics-kpi-sub">Tocá Nuevo gasto para empezar.</p>
        </div>
      );
    }
    if (vigentesFiltrados.length === 0) {
      return (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>Sin resultados</p>
        </div>
      );
    }
    if (tipoFiltro === "Todos" && !ordenMonto) {
      return GRUPOS_TIPO.map(({ key }) =>
        renderGrupo(
          key,
          vigentesFiltrados.filter((g) => getTipo(g) === key)
        )
      );
    }
    return vigentesFiltrados.map((g) => (
      <GastoRow key={g.id} g={g} onEdit={formState.openEdit} />
    ));
  };

  return (
    <div className="content">
      <p className="page-title">Gastos</p>
      <p className="page-subtitle">
        Fijos (alquiler, sueldos), variables (luz, gas) y puntuales (arreglos)
      </p>

      <GastosResumen
        dia={dia}
        semana={semana}
        mes={mes}
        desglose={desglose}
        onAbrirAnalytics={onAbrirAnalytics}
      />

      <GastosCierreChecklist
        items={checklistItems}
        weekKey={weekKey}
        checked={checklistChecked}
        onToggle={toggleChecklist}
      />

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="Buscar gasto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cat-tabs">
        {FILTROS_TIPO.map((f) => (
          <button
            key={f}
            type="button"
            className={`cat-tab ${tipoFiltro === f ? "active" : ""}`}
            onClick={() => {
              setTipoFiltro(f);
              if (f !== "Variable") setSoloSemanaActual(false);
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="gasto-toolbar">
        <button
          type="button"
          className={`cat-tab ${soloSemanaActual ? "active" : ""}`}
          onClick={aplicarFacturasSemana}
        >
          Facturas de la semana
        </button>
        <button
          type="button"
          className={`cat-tab ${ordenMonto ? "active" : ""}`}
          onClick={() => setOrdenMonto((v) => !v)}
        >
          {ordenMonto ? "Orden: monto ↓" : "Orden: tipo"}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lista de gastos</span>
          {vigentesFiltrados.length > 0 && (
            <span className="analytics-kpi-sub">{vigentesFiltrados.length}</span>
          )}
        </div>
        {renderListaVigentes()}

        {gastosHistoricos.length > 0 && (
          <div className="gasto-historicos">
            <button
              type="button"
              className="analytics-drill-accordion-btn"
              onClick={() => setShowHistoricos((v) => !v)}
              aria-expanded={showHistoricos}
            >
              <span style={{ flex: 1, textAlign: "left", fontWeight: 600 }}>
                Gastos pasados ({gastosHistoricos.length})
              </span>
              <span
                className="analytics-drill-accordion-chevron"
                aria-hidden
              >
                {showHistoricos ? "▾" : "▸"}
              </span>
            </button>
            {showHistoricos &&
              gastosHistoricos.map((g) => (
                <GastoRow
                  key={g.id}
                  g={g}
                  historico
                  onEdit={formState.openEdit}
                />
              ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="fab fab-receta"
        onClick={formState.openNew}
        title="Nuevo gasto"
      >
        <span>+</span>
        <span>Nuevo gasto</span>
      </button>

      {formState.modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              type="button"
              className="screen-back"
              onClick={formState.closeModal}
              disabled={formState.saving}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {formState.editando ? "Editar gasto" : "Nuevo gasto"}
            </span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Datos del gasto</span>
              </div>
              <div className="card-content">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <SearchableSelect
                    options={TIPOS_GASTO}
                    value={formState.form.tipo}
                    onChange={(v) =>
                      formState.setForm((f) => ({ ...f, tipo: v }))
                    }
                    placeholder="Seleccionar tipo"
                  />
                </div>
                <FormInput
                  label="Nombre"
                  value={formState.form.nombre}
                  onChange={(v) =>
                    formState.setForm((f) => ({ ...f, nombre: v }))
                  }
                  placeholder="Ej: Alquiler, Luz, Arreglo horno"
                  required
                />
                <FormMoneyInput
                  label="Monto"
                  value={formState.form.monto}
                  onChange={(v) =>
                    formState.setForm((f) => ({ ...f, monto: v }))
                  }
                  placeholder="300000"
                  required
                />
              </div>
            </div>

            {formState.form.tipo === "fijo" && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <span className="card-title">Configuración del gasto fijo</span>
                </div>
                <div className="card-content">
                  <p className="analytics-kpi-sub" style={{ marginBottom: 12 }}>
                    Definí cómo se distribuye y desde cuándo aplica este gasto
                    recurrente.
                  </p>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Frecuencia</label>
                      <SearchableSelect
                        options={FRECUENCIAS}
                        value={formState.form.frecuencia}
                        onChange={(v) =>
                          formState.setForm((f) => ({ ...f, frecuencia: v }))
                        }
                        placeholder="Frecuencia"
                      />
                    </div>
                  </div>
                  <DatePicker
                    label="Inicio vigencia"
                    value={formState.form.fechaInicioVigencia}
                    onChange={(v) =>
                      formState.setForm((f) => ({
                        ...f,
                        fechaInicioVigencia: v,
                      }))
                    }
                  />
                  <DatePicker
                    label="Fin vigencia (opcional)"
                    value={formState.form.fechaFinVigencia}
                    onChange={(v) =>
                      formState.setForm((f) => ({ ...f, fechaFinVigencia: v }))
                    }
                  />
                  <p className="analytics-kpi-sub" style={{ marginTop: 4 }}>
                    Desde esa fecha deja de contarse en Gastos y Analytics (el
                    último día que cuenta es el anterior).
                  </p>
                </div>
              </div>
            )}

            {(formState.form.tipo === "variable" ||
              formState.form.tipo === "puntual") && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <span className="card-title">Fecha del gasto</span>
                </div>
                <div className="card-content">
                  <DatePicker
                    label="Fecha"
                    value={formState.form.fecha}
                    onChange={(v) =>
                      formState.setForm((f) => ({ ...f, fecha: v }))
                    }
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={formState.save}
              disabled={formState.saving}
            >
              {formState.saving ? "Guardando…" : "Guardar"}
            </button>
            {formState.editando && (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => formState.openDuplicate(formState.editando)}
                  disabled={formState.saving}
                >
                  Duplicar gasto
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => eliminar(formState.editando)}
                  disabled={formState.saving}
                >
                  Eliminar gasto
                </button>
              </>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={formState.closeModal}
              disabled={formState.saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              type="button"
              className="screen-back"
              onClick={() => setDeleteModal(null)}
            >
              ← Volver
            </button>
            <span className="screen-title">Eliminar gasto</span>
          </div>
          <div className="screen-content">
            <p className="page-subtitle">
              Elegí cómo querés que afecte a tus períodos al eliminar el gasto
              <strong> {deleteModal.nombre}</strong>.
            </p>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-content">
                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="radio"
                      name="delete-mode"
                      value="solo-futuro"
                      checked={deleteMode === "solo-futuro"}
                      onChange={() => setDeleteMode("solo-futuro")}
                      style={{ marginRight: 8 }}
                    />
                    Eliminar solo desde hoy en adelante
                  </label>
                  <p className="analytics-kpi-sub">
                    Los períodos históricos quedan como estaban. Este gasto deja
                    de contarse desde hoy y en los días futuros.
                  </p>
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">
                    <input
                      type="radio"
                      name="delete-mode"
                      value="historico"
                      checked={deleteMode === "historico"}
                      onChange={() => setDeleteMode("historico")}
                      style={{ marginRight: 8 }}
                    />
                    Eliminar también de períodos anteriores
                  </label>
                  <p className="analytics-kpi-sub">
                    Recalcularemos los períodos pasados donde estaba este gasto.
                  </p>
                  {deleteMode === "historico" && (
                    <div style={{ marginTop: 8 }}>
                      <DatePicker
                        label="Eliminar histórico desde"
                        value={deleteDesde}
                        onChange={setDeleteDesde}
                      />
                      <p
                        className="analytics-kpi-sub"
                        style={{ marginTop: 4, color: "var(--danger)" }}
                      >
                        ⚠ Esta acción va a cambiar tus números históricos para
                        esos períodos.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{
                backgroundColor: "var(--danger)",
                borderColor: "var(--danger)",
              }}
              onClick={confirmarEliminacion}
            >
              Confirmar eliminación
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeleteModal(null)}
              style={{ marginTop: 8 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
