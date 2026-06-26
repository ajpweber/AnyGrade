"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100vh", gap: 16,
          fontFamily: "sans-serif", color: "#18181b", padding: 24,
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ margin: 0, color: "#71717a", fontSize: 14, textAlign: "center", maxWidth: 360 }}>
            An unexpected error occurred. If this keeps happening, please contact support.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 8, padding: "10px 20px", borderRadius: 8,
              background: "#4DB832", color: "#fff", border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
