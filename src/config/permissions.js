const ALL_TABS = [
  "dashboard",
  "insights",
  "ventas",
  "stock",
  "more",
  "analytics",
  "plan",
  "clientes",
  "insumos",
  "recetas",
  "promociones",
  "gastos",
  "pedidos",
];

const ROLE_ALLOWED_TABS = {
  admin: ALL_TABS,
  venta: ["ventas"],
};

export function normalizeRole(role) {
  if (role === "venta") return "venta";
  if (role === "admin") return "admin";
  return null;
}

export function getAllowedTabs(role) {
  const normalized = normalizeRole(role);
  return normalized ? ROLE_ALLOWED_TABS[normalized] : [];
}

export function canAccessTab(role, tab) {
  return getAllowedTabs(role).includes(tab);
}

export function getDefaultTabForRole(role) {
  return canAccessTab(role, "dashboard") ? "dashboard" : "ventas";
}

export function isVentaRole(role) {
  return normalizeRole(role) === "venta";
}

/** Cantidad de grupos de venta visibles en lista para rol venta */
export const VENTA_LIST_MAX_GROUPS = 5;

