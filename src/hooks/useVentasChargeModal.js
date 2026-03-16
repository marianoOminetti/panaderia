import { useState, useCallback } from "react";

/**
 * Estado y handlers del modal de cobro (total editable, abrir/cerrar).
 * Usado por Ventas.jsx. No registra la venta; solo controla el modal y el total override.
 * El guardado (registrarVentaCarrito) sigue en Ventas y recibe chargeTotalOverride desde este hook.
 * @returns {{ chargeModalOpen, setChargeModalOpen, chargeTotalOverride, setChargeTotalOverride, openChargeModal, closeChargeModal }}
 */
export function useVentasChargeModal() {
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeTotalOverride, setChargeTotalOverride] = useState("");

  const openChargeModal = useCallback(() => {
    setChargeTotalOverride("");
    setChargeModalOpen(true);
  }, []);

  const closeChargeModal = useCallback(() => {
    setChargeModalOpen(false);
    setChargeTotalOverride("");
  }, []);

  return {
    chargeModalOpen,
    setChargeModalOpen,
    chargeTotalOverride,
    setChargeTotalOverride,
    openChargeModal,
    closeChargeModal,
  };
}
