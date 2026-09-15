"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { ApiError, api, type ValidationErrors } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, router, user]);

  if (loading || user) return null;

  // A link without both parameters can never be valid, so say so up front
  // instead of letting the user fill in a form that is guaranteed to fail.
  if (!token || !email) {
    return (
      <section className="ds-auth-card grid w-full max-w-md gap-5">
        <header className="ds-auth-header">
          <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
            Taskly
          </p>
          <h1 className="ds-page-title mt-2">Link inválido</h1>
        </header>
        <p className="ds-alert" role="alert">
          Este link de redefinição está incompleto ou expirou. Solicite um novo.
        </p>
        <Link className="ds-button ds-button-primary" href="/forgot-password">
          Solicitar novo link
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className="ds-auth-card grid w-full max-w-md gap-5" aria-live="polite">
        <header className="ds-auth-header">
          <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
            Taskly
          </p>
          <h1 className="ds-page-title mt-2">Senha redefinida</h1>
        </header>
        <p className="ds-feedback ds-auth-sent">
          <CheckCircle2 className="ds-icon" aria-hidden="true" />
          <span>Sua senha foi alterada. Entre com a nova senha.</span>
        </p>
        <Link className="ds-button ds-button-primary" href="/login">
          Ir para o login
        </Link>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    setSubmitting(true);

    try {
      await api.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setDone(true);
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

  const passwordErrors = errors.password ?? [];
  // The backend reports an invalid or expired token under `email`.
  const tokenErrors = errors.email ?? [];

  return (
    <form className="ds-auth-card grid w-full max-w-md gap-5" onSubmit={submit} aria-busy={submitting}>
      <header className="ds-auth-header">
        <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
          Taskly
        </p>
        <h1 className="ds-page-title mt-2">Criar nova senha</h1>
        <p className="ds-copy mt-2">
          Definindo uma nova senha para <strong>{email}</strong>.
        </p>
      </header>
      {message && <p className="ds-alert" role="alert">{message}</p>}
      {tokenErrors.length > 0 && (
        <p className="ds-meta">
          <Link className="ds-accent-text font-semibold hover:underline" href="/forgot-password">
            Solicitar um novo link
          </Link>
        </p>
      )}
      <div className="ds-field grid gap-2">
        <label className="ds-label" htmlFor="auth-password">Nova senha</label>
        <PasswordInput
          id="auth-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          describedBy={passwordErrors.length > 0 ? "auth-password-error" : undefined}
          invalid={passwordErrors.length > 0}
          disabled={submitting}
          required
        />
        {passwordErrors.length > 0 && (
          <div id="auth-password-error" className="grid gap-1">
            {passwordErrors.map((error) => (
              <span className="ds-danger-text text-xs font-normal" key={error}>
                {error}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="ds-field grid gap-2">
        <label className="ds-label" htmlFor="auth-password_confirmation">Confirmar nova senha</label>
        <PasswordInput
          id="auth-password_confirmation"
          value={passwordConfirmation}
          onChange={setPasswordConfirmation}
          autoComplete="new-password"
          disabled={submitting}
          required
        />
      </div>
      <button
        className="ds-button ds-button-primary ds-auth-submit"
        type="submit"
        disabled={submitting}
      >
        {submitting ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="ds-auth-page flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="ds-meta">Carregando...</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="ds-copy">
        <Link className="ds-accent-text font-semibold hover:underline" href="/login">
          Voltar para o login
        </Link>
      </p>
    </main>
  );
}
