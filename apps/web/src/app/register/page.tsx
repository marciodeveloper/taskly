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
    <main className="flex flex-1 flex-col items-center justify-center gap-5 bg-slate-100 px-6 py-16">
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
      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-semibold text-indigo-600 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}
