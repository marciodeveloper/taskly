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
    <label className="grid gap-2 text-sm font-medium text-slate-700" key={name}>
      {label}
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
        type={type}
        value={values[name] ?? ""}
        onChange={(event) => update(name, event.target.value)}
        autoComplete={type === "password" ? "new-password" : name}
        required
      />
      {errors[name]?.map((error) => (
        <span className="text-xs font-normal text-red-600" key={error}>
          {error}
        </span>
      ))}
    </label>
  );

  return (
    <form
      className="grid w-full max-w-md gap-5 rounded-2xl bg-white p-8 shadow-xl"
      onSubmit={submit}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Taskly
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
      </div>
      {message && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>
      )}
      {fields === "register" && input("name", "Name")}
      {input("email", "Email", "email")}
      {input("password", "Password", "password")}
      {fields === "register" &&
        input("password_confirmation", "Confirm password", "password")}
      <button
        className="rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "Please wait..." : submitLabel}
      </button>
    </form>
  );
}
