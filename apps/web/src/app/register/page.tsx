"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/lib/auth/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, router, user]);

  if (loading || user) return null;

  return (
    <main className="ds-auth-page flex flex-1 flex-col items-center justify-center gap-5 px-4 py-16 sm:px-6">
      <AuthForm
        title="Create your account"
        submitLabel="Create account"
        fields="register"
        onSubmit={async (values) => {
          await register(
            values.name,
            values.email,
            values.password,
            values.password_confirmation,
          );
          router.push("/dashboard");
        }}
      />
      <p className="ds-copy">
        Already have an account?{" "}
        <Link className="ds-accent-text font-semibold hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
