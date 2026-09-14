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
    <main className="flex flex-1 flex-col items-center justify-center gap-5 bg-slate-100 px-6 py-16">
      <AuthForm
        title="Welcome back"
        submitLabel="Sign in"
        fields="login"
        onSubmit={async (values) => {
          await login(values.email, values.password);
          router.push("/dashboard");
        }}
      />
      <p className="text-sm text-slate-600">
        New to Taskly?{" "}
        <Link className="font-semibold text-indigo-600 hover:underline" href="/register">
          Create an account
        </Link>
      </p>
    </main>
  );
}
