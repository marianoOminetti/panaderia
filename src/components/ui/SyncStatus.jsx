/**
 * Indicador inline de sincronización en background (no bloquea la UI).
 * Usar cuando el contenido ya es usable pero faltan datos secundarios.
 */
export default function SyncStatus({ message = "Sincronizando ventas…" }) {
  return (
    <div className="sync-status" role="status" aria-live="polite" aria-busy="true">
      <div className="sync-status-inner">
        <div className="spinner spinner-sm" aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}
