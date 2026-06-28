export const TIPO_LABEL = { fijo: "Fijo", variable: "Variable", puntual: "Puntual" };

export const TIPOS_GASTO = [
  { value: "fijo", label: "Fijo (recurrente)" },
  { value: "variable", label: "Variable (facturas)" },
  { value: "puntual", label: "Puntual (una vez)" },
];

export const FRECUENCIAS = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
];

export const FILTROS_TIPO = ["Todos", "Fijo", "Variable", "Puntual"];

export const GRUPOS_TIPO = [
  { key: "fijo", label: "Fijos recurrentes" },
  { key: "variable", label: "Variables" },
  { key: "puntual", label: "Puntuales" },
];

export const TIPO_COLORS = {
  fijo: "var(--purple)",
  variable: "#E8A317",
  puntual: "#6B9080",
};

export const CHECKLIST_DEFAULT = ["Luz", "Gas", "Delivery"];
export const CHECKLIST_STORAGE_KEY = "gastos.cierreChecklist";
