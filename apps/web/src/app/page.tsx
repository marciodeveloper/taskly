import Link from "next/link";

export default function Home() {
  return (
    <main className="ds-auth-page flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <section className="max-w-xl text-center">
        <p className="ds-accent-text text-xs font-semibold uppercase tracking-wider">
          Taskly
        </p>
        <h1 className="ds-page-title mt-4">
          Keep your work moving.
        </h1>
        <p className="ds-copy mt-5">
          Sign in to your focused workspace or create an account to get started.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            className="ds-button ds-button-primary"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="ds-button ds-button-secondary"
            href="/register"
          >
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
