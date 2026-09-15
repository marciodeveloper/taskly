"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, router, user]);

  if (loading || user) return null;

  return (
    <main className="ds-auth-page flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 sm:px-6">
      <AuthForm
        title="Bem-vindo de volta"
        subtitle="Entre para continuar de onde você parou."
        submitLabel="Entrar"
        pendingLabel="Entrando..."
        fields="login"
        onSubmit={async (values) => {
          await login(values.email, values.password);
          router.push("/dashboard");
        }}
      />
      <p className="ds-copy">
        <Link className="ds-accent-text font-semibold hover:underline" href="/forgot-password">
          Esqueci minha senha
        </Link>
      </p>
      <p className="ds-copy">
        Ainda não tem conta?{" "}
        <Link className="ds-accent-text font-semibold hover:underline" href="/register">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
