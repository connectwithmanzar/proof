import { Suspense } from "react";
import { FeedbackClient } from "./FeedbackClient";

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <main className="px-5 pt-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
            Reckoning
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Reading your reckoning…
          </h1>
        </main>
      }
    >
      <FeedbackClient />
    </Suspense>
  );
}
