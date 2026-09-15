"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { ApiError, api, type ValidationErrors } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [message, setMessage] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, router, user]);

  if (loading || user) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    setSubmitting(true);

    try {
      const { message: confirmation } = await api.forgotPassword({ email });
      setSentMessage(confirmation);
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

  const invalid = (errors.email ?? []).length > 0;

  return (
    <main className="ds-auth-page flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 sm:px-6">
      {sentMessage ? (
        <section className="ds-auth-card grid w-full max-w-md gap-5" aria-live="polite">
          <header className="ds-auth-header">
            <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
              Taskly
            </p>
            <h1 className="ds-page-title mt-2">Verifique seu e-mail</h1>
          </header>
          <p className="ds-feedback ds-auth-sent">
            <MailCheck className="ds-icon" aria-hidden="true" />
            <span>{sentMessage}</span>
          </p>
          <p className="ds-meta">
            O link expira em 60 minutos. Se não encontrar a mensagem, confira a caixa de spam.
          </p>
          <Link className="ds-button ds-button-secondary" href="/login">
            Voltar para o login
          </Link>
        </section>
      ) : (
        <form className="ds-auth-card grid w-full max-w-md gap-5" onSubmit={submit} aria-busy={submitting}>
          <header className="ds-auth-header">
            <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
              Taskly
            </p>
            <h1 className="ds-page-title mt-2">Esqueceu sua senha?</h1>
            <p className="ds-copy mt-2">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>
          </header>
          {message && <p className="ds-alert" role="alert">{message}</p>}
          <div className="ds-field grid gap-2">
            <label className="ds-label" htmlFor="auth-email">E-mail</label>
            <input
              id="auth-email"
              className="ds-input"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors({});
              }}
              autoComplete="email"
              aria-describedby={invalid ? "auth-email-error" : undefined}
              aria-invalid={invalid || undefined}
              disabled={submitting}
              required
            />
            {invalid && (
              <div id="auth-email-error" className="grid gap-1">
                {errors.email?.map((error) => (
                  <span className="ds-danger-text text-xs font-normal" key={error}>
                    {error}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            className="ds-button ds-button-primary ds-auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Enviando..." : "Enviar link de redefinição"}
          </button>
        </form>
      )}
      <p className="ds-copy">
        Lembrou a senha?{" "}
        <Link className="ds-accent-text font-semibold hover:underline" href="/login">
          Entrar
        </Link>
      </p>
    </main>
  );
}
