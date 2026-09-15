"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { ApiError, type ValidationErrors } from "@/lib/api/client";

type AuthFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  pendingLabel: string;
  fields: "login" | "register";
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function AuthForm({
  title,
  subtitle,
  submitLabel,
  pendingLabel,
  fields,
  onSubmit,
}: AuthFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    setSubmitting(true);

    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
        setErrors(error.validationErrors);
      } else {
        setMessage("Algo deu errado. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fieldErrors = (name: string) => errors[name] ?? [];

  const errorMessages = (name: string) =>
    fieldErrors(name).map((error) => (
      <span className="ds-danger-text text-xs font-normal" key={error}>
        {error}
      </span>
    ));

  const textField = (
    name: string,
    label: string,
    type: "text" | "email",
    autoComplete: string,
  ) => {
    const invalid = fieldErrors(name).length > 0;

    return (
      <div className="ds-field grid gap-2" key={name}>
        <label className="ds-label" htmlFor={`auth-${name}`}>
          {label}
        </label>
        <input
          id={`auth-${name}`}
          className="ds-input"
          type={type}
          value={values[name] ?? ""}
          onChange={(event) => update(name, event.target.value)}
          autoComplete={autoComplete}
          aria-describedby={invalid ? `auth-${name}-error` : undefined}
          aria-invalid={invalid || undefined}
          disabled={submitting}
          required
        />
        {invalid && (
          <div id={`auth-${name}-error`} className="grid gap-1">
            {errorMessages(name)}
          </div>
        )}
      </div>
    );
  };

  const passwordField = (
    name: string,
    label: string,
    autoComplete: "current-password" | "new-password",
  ) => {
    const invalid = fieldErrors(name).length > 0;

    return (
      <div className="ds-field grid gap-2" key={name}>
        <label className="ds-label" htmlFor={`auth-${name}`}>
          {label}
        </label>
        <PasswordInput
          id={`auth-${name}`}
          value={values[name] ?? ""}
          onChange={(value) => update(name, value)}
          autoComplete={autoComplete}
          describedBy={invalid ? `auth-${name}-error` : undefined}
          invalid={invalid}
          disabled={submitting}
          required
        />
        {invalid && (
          <div id={`auth-${name}-error`} className="grid gap-1">
            {errorMessages(name)}
          </div>
        )}
      </div>
    );
  };

  return (
    <form
      className="ds-auth-card grid w-full max-w-md gap-5"
      onSubmit={submit}
      aria-busy={submitting}
    >
      <header className="ds-auth-header">
        <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
          Taskly
        </p>
        <h1 className="ds-page-title mt-2">{title}</h1>
        <p className="ds-copy mt-2">{subtitle}</p>
      </header>
      {message && (
        <p className="ds-alert" role="alert">{message}</p>
      )}
      {fields === "register" && textField("name", "Nome", "text", "name")}
      {textField("email", "E-mail", "email", "email")}
      {passwordField(
        "password",
        "Senha",
        fields === "register" ? "new-password" : "current-password",
      )}
      {fields === "register" &&
        passwordField("password_confirmation", "Confirmar senha", "new-password")}
      <button
        className="ds-button ds-button-primary ds-auth-submit"
        type="submit"
        disabled={submitting}
      >
        {submitting ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
