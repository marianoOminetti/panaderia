import { useId } from "react";

/**
 * Checkbox con label inline, estilo unificado de la app.
 */
export default function FormCheckbox({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  className = "",
  style,
}) {
  const id = useId();

  return (
    <div className={`form-checkbox-group ${className}`.trim()} style={style}>
      <label className="form-checkbox-label" htmlFor={id}>
        <input
          id={id}
          name={name}
          type="checkbox"
          className="form-checkbox"
          checked={checked ?? false}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="form-checkbox-custom" />
        {label && <span className="form-checkbox-text">{label}</span>}
      </label>
    </div>
  );
}
