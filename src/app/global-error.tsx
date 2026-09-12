"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#000",
          color: "#fff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          margin: 0,
          minHeight: "100vh",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 28, margin: 0 }}>Proof hit a problem</h1>
        <p style={{ color: "#a1a1aa", marginTop: 12 }}>
          Your check-ins stay on this phone.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 24,
            minHeight: 56,
            width: "100%",
            border: 0,
            borderRadius: 16,
            background: "#fff",
            color: "#000",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
