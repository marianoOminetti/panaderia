/**
 * Ejecuta mutación optimista: actualiza UI al instante, persiste en background, rollback + toast si falla.
 */
export function runOptimisticAction({
  optimistic,
  persist,
  rollback,
  showToast,
  pendingMessage,
  successMessage,
  errorMessage = "⚠️ Error al guardar",
  onError,
}) {
  optimistic?.();
  if (pendingMessage) showToast?.(pendingMessage);
  return Promise.resolve()
    .then(() => persist())
    .then((result) => {
      if (successMessage) showToast?.(successMessage);
      return result;
    })
    .catch((err) => {
      rollback?.();
      onError?.(err);
      showToast?.(errorMessage);
      throw err;
    });
}
