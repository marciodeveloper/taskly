"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ApiError, type ValidationErrors } from "@/lib/api/client";

type AuthFormProps = {
  title: string;
  submitLabel: string;
  fields: "login" | "register";
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function AuthForm({
  title,
  submitLabel,
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
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const input = (name: string, label: string, type = "text") => (
    <label className="ds-label grid gap-2" key={name}>
      {label}
      <input
        className="ds-input"
        type={type}
        value={values[name] ?? ""}
        onChange={(event) => update(name, event.target.value)}
        autoComplete={type === "password" ? "new-password" : name}
        required
      />
      {errors[name]?.map((error) => (
        <span className="ds-danger-text text-xs font-normal" key={error}>
          {error}
        </span>
      ))}
    </label>
  );

  return (
    <form
      className="ds-auth-card grid w-full max-w-md gap-5"
      onSubmit={submit}
    >
      <div>
        <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
          Taskly
        </p>
        <h1 className="ds-page-title mt-2">{title}</h1>
      </div>
      {message && (
        <p className="ds-alert" role="alert">{message}</p>
      )}
      {fields === "register" && input("name", "Name")}
      {input("email", "Email", "email")}
      {input("password", "Password", "password")}
      {fields === "register" &&
        input("password_confirmation", "Confirm password", "password")}
      <button
        className="ds-button ds-button-primary"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "Please wait..." : submitLabel}
      </button>
    </form>
  );
}
