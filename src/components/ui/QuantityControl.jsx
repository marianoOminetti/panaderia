import { useId } from "react";

/**
 * Control de cantidad con botones +/- y valor editable.
 * value: número o string
 * onChange: (value: number) => void
 * onChangeRaw: (value: string) => void - para permitir edición manual
 */
export default function QuantityControl({
  value,
  onChange,
  onChangeRaw,
  min = 0,
  max,
  step = 1,
  disabled = false,
  size = "md",
  showInput = true,
  allowDecimals = true,
  label,
  name,
  className = "",
}) {
  const inputId = useId();
  const numValue = typeof value === "string" ? parseFloat(value) || 0 : value || 0;
  
  const getStep = (direction) => {
    if (step !== "auto") return step;
    if (direction === "up") {
      return numValue < 1 ? 0.1 : 1;
    } else {
      return numValue <= 1 ? 0.1 : 1;
    }
  };

  const handleDecrement = () => {
    if (disabled) return;
    const s = getStep("down");
    const next = Math.max(min, numValue - s);
    const rounded = Math.round(next * 10) / 10;
    onChange(rounded);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const s = getStep("up");
    const next = max != null ? Math.min(max, numValue + s) : numValue + s;
    const rounded = Math.round(next * 10) / 10;
    onChange(rounded);
  };

  const handleInputChange = (e) => {
    let v = e.target.value.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
    if (!allowDecimals) {
      v = v.replace(/\./g, "");
    }
    if (onChangeRaw) {
      onChangeRaw(v);
    } else {
      const n = parseFloat(v);
      if (!isNaN(n)) onChange(n);
    }
  };

  const sizeStyles = {
    sm: { btn: 28, font: 14, input: 40 },
    md: { btn: 36, font: 16, input: 50 },
    lg: { btn: 44, font: 18, input: 60 },
  };
  const s = sizeStyles[size] || sizeStyles.md;

  const displayValue = typeof value === "string" ? value : 
    (allowDecimals ? numValue : Math.round(numValue));

  return (
    <div className={`quantity-control ${className}`.trim()}>
      {label && <span className="quantity-label">{label}</span>}
      <div className="quantity-buttons">
        <button
          type="button"
          className="quantity-btn quantity-btn-minus"
          onClick={handleDecrement}
          disabled={disabled || numValue <= min}
          style={{ width: s.btn, height: s.btn, fontSize: s.font }}
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        {showInput ? (
          <input
            id={inputId}
            name={name}
            type="text"
            inputMode={allowDecimals ? "decimal" : "numeric"}
            className="quantity-input"
            value={displayValue}
            onChange={handleInputChange}
            disabled={disabled}
            style={{ width: s.input, fontSize: s.font }}
            aria-label={label || "Cantidad"}
          />
        ) : (
          <span className="quantity-value" style={{ minWidth: s.input, fontSize: s.font }}>
            {displayValue}
          </span>
        )}
        <button
          type="button"
          className="quantity-btn quantity-btn-plus"
          onClick={handleIncrement}
          disabled={disabled || (max != null && numValue >= max)}
          style={{ width: s.btn, height: s.btn, fontSize: s.font }}
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>
    </div>
  );
}
