"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading || !user) return null;

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-100 px-6 py-16">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Taskly
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Welcome, {user.name}.
        </h1>
        <p className="mt-3 text-slate-600">You are authenticated.</p>
        <button
          className="mt-8 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </section>
    </main>
  );
}
