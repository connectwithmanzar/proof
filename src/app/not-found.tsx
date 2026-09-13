import Link from "next/link";

export default function NotFound() {
  return (
    <main className="px-5 pt-16">
      <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-3 text-zinc-400">That screen isn’t in Reckoning.</p>
      <Link href="/" className="reckoning-btn-primary mt-8">
        Back home
      </Link>
    </main>
  );
}
