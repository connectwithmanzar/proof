"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="px-5 pt-16">
      <h1 className="text-3xl font-semibold tracking-tight">Something broke</h1>
      <p className="mt-3 text-zinc-400">
        Your photos are still on this phone. Try again.
      </p>
      <button type="button" onClick={reset} className="proof-btn-primary mt-8">
        Try again
      </button>
    </main>
  );
}
