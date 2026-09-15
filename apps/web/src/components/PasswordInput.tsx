"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
};

/**
 * Password field with its own show/hide control. Each instance keeps its own
 * visibility state, so sibling fields never toggle together.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  describedBy,
  invalid,
  disabled,
  required,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Ocultar senha" : "Mostrar senha";
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <div className="ds-input-affix">
      <input
        id={id}
        className="ds-input"
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        required={required}
      />
      <button
        className="ds-input-affix-button"
        type="button"
        aria-label={toggleLabel}
        aria-pressed={visible}
        title={toggleLabel}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        <ToggleIcon className="ds-icon" aria-hidden="true" />
      </button>
    </div>
  );
}
