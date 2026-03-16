import { useId } from "react";

/**
 * Input para montos de dinero con símbolo $ integrado.
 * value: número o string
 * onChange: (value: string) => void
 */
export default function FormMoneyInput({
  label,
  name,
  value,
  onChange,
  placeholder = "0",
  disabled = false,
  required = false,
  className = "",
  style,
  allowDecimals = true,
  autoFocus = false,
}) {
  const id = useId();

  const handleChange = (e) => {
    let v = e.target.value;
    v = v.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    if (!allowDecimals) {
      v = v.replace(/\./g, "");
    }
    onChange(v);
  };

  return (
    <div className={`form-group ${className}`.trim()} style={style}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && <span style={{ color: "var(--danger)", marginLeft: 4 }}>*</span>}
        </label>
      )}
      <div className="form-money-wrapper">
        <span className="form-money-symbol">$</span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode={allowDecimals ? "decimal" : "numeric"}
          className="form-input form-money-input"
          value={value ?? ""}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}
