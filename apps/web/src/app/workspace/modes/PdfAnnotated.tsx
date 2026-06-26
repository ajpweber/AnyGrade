"use client"

import { useEffect, useRef, useState } from "react"
import type { GradeResult } from "@/app/api/grade/types"

type Props = {
  objectUrl: string
  results: GradeResult[]
}

const BBOX_COLOR: Record<string, string> = {
  correct: "#4DB832",
  wrong:   "#D97706",
  unread:  "#ef4444",
}

function resultColor(r: GradeResult) {
  if (r.correct === true)  return BBOX_COLOR.correct
  if (r.correct === false) return BBOX_COLOR.wrong
  return BBOX_COLOR.unread
}

export function PdfAnnotated({ objectUrl, results }: Props) {
  const [canvases, setCanvases] = useState<string[]>([]) // data URLs per page
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    setCanvases([])

    let cancelled = false
    ;(async () => {
      try {
        // Dynamic import to avoid SSR issues
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString()

        const resp = await fetch(objectUrl)
        const buf  = await resp.arrayBuffer()
        const pdf  = await pdfjsLib.getDocument({ data: buf }).promise

        const pageDataUrls: string[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          const page   = await pdf.getPage(i)
          const scale  = 2 // retina
          const vp     = page.getViewport({ scale })

          const canvas  = document.createElement("canvas")
          canvas.width  = vp.width
          canvas.height = vp.height
          const ctx     = canvas.getContext("2d")!

          await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise

          // Draw bboxes that belong to this page (1-based)
          for (const r of results) {
            if (!r.bbox) continue
            if (r.bbox.page !== i) continue
            const color = resultColor(r)
            const x = r.bbox.x * vp.width
            const y = r.bbox.y * vp.height
            const w = r.bbox.w * vp.width
            const h = r.bbox.h * vp.height

            ctx.strokeStyle = color
            ctx.lineWidth   = 3
            ctx.strokeRect(x, y, w, h)

            // Label chip above the box
            ctx.font         = "bold 20px sans-serif"
            ctx.fillStyle    = "rgba(0,0,0,0.65)"
            const textW      = ctx.measureText(r.label).width + 12
            ctx.fillRect(x, y - 26, textW, 24)
            ctx.fillStyle    = color
            ctx.fillText(r.label, x + 6, y - 8)
          }

          pageDataUrls.push(canvas.toDataURL())
        }

        if (!cancelled && mountedRef.current) {
          setCanvases(pageDataUrls)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled && mountedRef.current) {
          setError(e instanceof Error ? e.message : "Could not render PDF")
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [objectUrl, results])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 0", fontSize: 12, color: "#a1a1aa" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4DB832", animation: "ag-pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
        Rendering PDF…
      </div>
    )
  }

  if (error) {
    return (
      <embed src={objectUrl} type="application/pdf" style={{ width: "100%", height: 480, borderRadius: 6, border: "1px solid #e4e4e7", display: "block" }} />
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {canvases.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Page ${i + 1}`}
          style={{ width: "100%", borderRadius: 6, border: "1px solid #e4e4e7", display: "block" }}
        />
      ))}
    </div>
  )
}


