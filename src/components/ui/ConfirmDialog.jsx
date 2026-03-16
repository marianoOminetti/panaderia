import { useEffect, useRef } from "react";

export default function ConfirmDialog({ message, destructive, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);
  return (
    <div className="confirm-backdrop" onClick={onCancel} role="presentation">
      <div
        ref={dialogRef}
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-message"
        tabIndex={-1}
      >
        <div className="confirm-body">
          <p id="confirm-message" className="confirm-message">
            {message}
          </p>
          <div className="confirm-actions">
            <button
              type="button"
              className={`confirm-btn ${destructive ? "destructive" : ""}`}
              onClick={onConfirm}
            >
              {destructive ? "Eliminar" : "Aceptar"}
            </button>
            <button type="button" className="confirm-btn cancel" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
