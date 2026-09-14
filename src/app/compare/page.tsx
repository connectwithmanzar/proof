import { Suspense } from "react";
import { CompareClient } from "./CompareClient";

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="px-5 pt-6">
          <h1 className="text-4xl font-semibold tracking-tight">Compare</h1>
          <p className="mt-2 text-zinc-400">You vs you.</p>
          <p className="mt-4 text-zinc-500">Loading your check-ins…</p>
        </main>
      }
    >
      <CompareClient />
    </Suspense>
  );
}
