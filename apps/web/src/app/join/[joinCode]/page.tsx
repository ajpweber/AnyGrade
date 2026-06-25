import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { JoinForm } from "./JoinForm"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function JoinPage({ params }: { params: Promise<{ joinCode: string }> }) {
  const { joinCode } = await params

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, subject, academic_year, semester")
    .eq("join_code", joinCode.toUpperCase())
    .single()

  if (!cls) notFound()

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0d0d", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 16px", fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#4DB832", marginBottom: 10 }}>
            AnyGrade
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24 }}>{cls.name}</h1>
          <div style={{ fontSize: 14, color: "#666" }}>
            {[cls.subject, cls.semester, cls.academic_year].filter(Boolean).join(" · ")}
          </div>
        </div>

        <JoinForm classId={cls.id} joinCode={joinCode.toUpperCase()} />
      </div>
    </div>
  )
}
