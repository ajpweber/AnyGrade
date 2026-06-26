"use client"

import { useState } from "react"
import { joinClass } from "./actions"

type Props = {
  classId: string
  joinCode: string
}

export function JoinForm({ classId }: Props) {
  const [name,  setName]  = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done,  setDone]  = useState(false)
  const [busy,  setBusy]  = useState(false)

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
        <h2 style={{ margin: "0 0 8px", color: "#4DB832" }}>You&apos;re in!</h2>
        <p style={{ color: "#666", margin: 0, fontSize: 14 }}>
          Your teacher will send graded papers to <strong>{email}</strong>.
          You can close this tab.
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setBusy(true)
    setError(null)
    const result = await joinClass({ classId, name: name.trim(), email: email.trim() })
    if (result?.error) {
      setError(result.error)
      setBusy(false)
    } else {
      setDone(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#888", textAlign: "center" }}>
        Enter your name exactly as you write it on your answer sheets.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".08em" }}>
          Full name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Last, First M.I. — exactly as on your paper"
          required
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: ".08em" }}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          style={inputStyle}
        />
        <span style={{ fontSize: 11, color: "#555" }}>
          Graded papers and corrections will be sent here.
        </span>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: 13, color: "#ef4444" }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !name.trim() || !email.trim()}
        style={{
          padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none",
          background: busy || !name.trim() || !email.trim() ? "#2a2a2a" : "#4DB832",
          color: busy || !name.trim() || !email.trim() ? "#555" : "#fff",
          cursor: busy || !name.trim() || !email.trim() ? "default" : "pointer",
          marginTop: 4,
        }}
      >
        {busy ? "Joining…" : "Join class"}
      </button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  background: "#1a1a1a",
  color: "#fff",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
}
