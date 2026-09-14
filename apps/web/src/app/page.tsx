import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-100 px-6 py-16">
      <section className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
          Taskly
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900">
          Keep your work moving.
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          Sign in to your focused workspace or create an account to get started.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            href="/register"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
