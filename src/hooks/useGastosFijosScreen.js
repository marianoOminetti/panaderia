import { useState, useMemo, useCallback } from "react";
import {
  calcularGastosTotales,
  getSemanaActualBounds,
  gastoEnSemana,
} from "../lib/gastosFijos";
import { useGastosFijos as useGastosFijosMutations } from "./useGastosFijos";
import { useGastosFijosForm } from "./useGastosFijosForm";
import { reportError } from "../utils/errorReport";
import {
  CHECKLIST_DEFAULT,
  CHECKLIST_STORAGE_KEY,
} from "../components/gastos/gastosFijosConstants";
import { getTipo, sortGastos } from "../components/gastos/gastosFijosHelpers";

export function useGastosFijosScreen({
  gastos,
  onRefresh,
  appendGasto,
  updateGastoInState,
  removeGasto,
  showToast,
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

  const { saveGastoFijo, deleteGastoFijo } = useGastosFijosMutations({
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

  return {
    deleteModal,
    setDeleteModal,
    deleteMode,
    setDeleteMode,
    deleteDesde,
    setDeleteDesde,
    search,
    setSearch,
    tipoFiltro,
    setTipoFiltro,
    soloSemanaActual,
    setSoloSemanaActual,
    ordenMonto,
    setOrdenMonto,
    showHistoricos,
    setShowHistoricos,
    checklistChecked,
    weekKey,
    dia,
    semana,
    mes,
    desglose,
    formState,
    gastosVigentes,
    gastosHistoricos,
    vigentesFiltrados,
    subtotalGrupo,
    checklistItems,
    toggleChecklist,
    eliminar,
    confirmarEliminacion,
    aplicarFacturasSemana,
  };
}
