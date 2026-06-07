import { createContext, useContext } from "react";

const AppDataContext = createContext(null);

/** Datos compartidos de catálogo/ventas para reducir prop drilling en tabs pesados. */
export function AppDataProvider({ value, children }) {
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppDataContext() {
  return useContext(AppDataContext);
}
