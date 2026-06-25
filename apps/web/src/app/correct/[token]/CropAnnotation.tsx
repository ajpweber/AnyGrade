"use client"

import { useEffect, useRef, useState } from "react"
import type { BBox } from "@/app/api/grade/types"

type Props = {
  scanUrl: string
  page: number        // 1-based
  bboxes: BBox[]      // one per distinct boxed region
  label: string
  color: string
  onConfirm: (corrected: BBox[]) => void
}

type DragMode =
  | { type: "move";   idx: number }
  | { type: "resize"; idx: number; corner: "nw" | "ne" | "se" | "sw" }
  | { type: "pan" }
  | null

const PADDING_PX   = 80
const DISPLAY_SIZE = 420
const HANDLE       = 12

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

function unionBBox(boxes: BBox[]): BBox {
  const x  = Math.min(...boxes.map(b => b.x))
  const y  = Math.min(...boxes.map(b => b.y))
  const x2 = Math.max(...boxes.map(b => b.x + b.w))
  const y2 = Math.max(...boxes.map(b => b.y + b.h))
  return { page: boxes[0].page, x, y, w: x2 - x, h: y2 - y }
}

function tightCrop(boxes: BBox[], pageW: number, pageH: number) {
  const u        = unionBBox(boxes)
  const bboxPxW  = u.w * pageW
  const bboxPxH  = u.h * pageH
  const halfSize = Math.max(bboxPxW, bboxPxH) / 2 + PADDING_PX
  const cw = Math.min(1, (halfSize * 2) / pageW)
  const ch = Math.min(1, (halfSize * 2) / pageH)
  const cx = clamp((u.x + u.w / 2) - cw / 2, 0, 1 - cw)
  const cy = clamp((u.y + u.h / 2) - ch / 2, 0, 1 - ch)
  return { cx, cy, cw, ch }
}

function quarterCrop(boxes: BBox[], pageW: number, pageH: number) {
  const u  = unionBBox(boxes)
  const S  = Math.sqrt(pageW * pageH) / 2
  const cw = S / pageW
  const ch = S / pageH
  const cx = clamp((u.x + u.w / 2) - cw / 2, 0, 1 - cw)
  const cy = clamp((u.y + u.h / 2) - ch / 2, 0, 1 - ch)
  return { cx, cy, cw, ch }
}

function hitTest(
  mx: number, my: number,
  boxes: BBox[],
  crop: { cx: number; cy: number; cw: number; ch: number },
  sz: number,
): DragMode {
  // Check each box, last (top-drawn) first for natural layering
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b  = boxes[i]
    const { cx, cy, cw, ch } = crop
    const bx = ((b.x - cx) / cw) * sz
    const by = ((b.y - cy) / ch) * sz
    const bw = (b.w / cw) * sz
    const bh = (b.h / ch) * sz

    const nearCorner = (px: number, py: number) =>
      Math.abs(mx - px) <= HANDLE && Math.abs(my - py) <= HANDLE
    if (nearCorner(bx,      by))      return { type: "resize", idx: i, corner: "nw" }
    if (nearCorner(bx + bw, by))      return { type: "resize", idx: i, corner: "ne" }
    if (nearCorner(bx + bw, by + bh)) return { type: "resize", idx: i, corner: "se" }
    if (nearCorner(bx,      by + bh)) return { type: "resize", idx: i, corner: "sw" }
    if (mx >= bx - 8 && mx <= bx + bw + 8 && my >= by - 8 && my <= by + bh + 8)
      return { type: "move", idx: i }
  }
  return { type: "pan" }
}

function applyDelta(
  mode: DragMode,
  boxes: BBox[],
  crop: { cx: number; cy: number; cw: number; ch: number },
  dx: number, dy: number, sz: number,
): { boxes: BBox[]; crop: typeof crop } {
  const MIN = 0.01
  const dfx = (dx / sz) * crop.cw
  const dfy = (dy / sz) * crop.ch

  if (mode?.type === "pan") {
    const cx = clamp(crop.cx - dfx, 0, 1 - crop.cw)
    const cy = clamp(crop.cy - dfy, 0, 1 - crop.ch)
    return { boxes, crop: { ...crop, cx, cy } }
  }

  if (mode?.type === "move") {
    const b   = boxes[mode.idx]
    const nb  = { ...b, x: clamp(b.x + dfx, 0, 1 - b.w), y: clamp(b.y + dfy, 0, 1 - b.h) }
    const out = boxes.map((box, i) => i === mode.idx ? nb : box)
    return { boxes: out, crop }
  }

  if (mode?.type === "resize") {
    const b   = boxes[mode.idx]
    let { x, y, w, h } = b
    switch (mode.corner) {
      case "nw": x += dfx; y += dfy; w -= dfx; h -= dfy; break
      case "ne":            y += dfy; w += dfx; h -= dfy; break
      case "se":                      w += dfx; h += dfy; break
      case "sw": x += dfx;            w -= dfx; h += dfy; break
    }
    w = Math.max(MIN, w); h = Math.max(MIN, h)
    x = clamp(x, 0, 1 - w); y = clamp(y, 0, 1 - h)
    const out = boxes.map((box, i) => i === mode.idx ? { ...b, x, y, w, h } : box)
    return { boxes: out, crop }
  }

  return { boxes, crop }
}

export function CropAnnotation({ scanUrl, page, bboxes, label, color, onConfirm }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const [mode, setMode]         = useState<DragMode>(null)
  const [zoomed, setZoomed]     = useState(false)
  const [showZoom, setShowZoom] = useState(false)
  const zoomedRef  = useRef(false)
  const dragOrigin = useRef<{ mx: number; my: number } | null>(null)
  const pageCanvas = useRef<HTMLCanvasElement | null>(null)
  const pageWRef   = useRef(0)
  const pageHRef   = useRef(0)
  const cropRef    = useRef({ cx: 0, cy: 0, cw: 0, ch: 0 })
  const liveBoxes  = useRef<BBox[]>([...bboxes])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const pdfjsLib = await import("pdfjs-dist")
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString()

      const resp = await fetch(scanUrl)
      const buf  = await resp.arrayBuffer()
      const pdf  = await pdfjsLib.getDocument({ data: buf }).promise
      const pg   = await pdf.getPage(page)
      const vp   = pg.getViewport({ scale: 2 })
      const pc   = document.createElement("canvas")
      pc.width = vp.width; pc.height = vp.height
      await pg.render({ canvasContext: pc.getContext("2d")!, viewport: vp, canvas: pc }).promise
      if (cancelled) return

      pageCanvas.current = pc
      pageWRef.current   = pc.width
      pageHRef.current   = pc.height
      liveBoxes.current  = [...bboxes]

      const tight   = tightCrop(bboxes, pc.width, pc.height)
      const quarter = quarterCrop(bboxes, pc.width, pc.height)
      cropRef.current = tight
      drawCrop()

      if (quarter.cw * quarter.ch > tight.cw * tight.ch * 1.5) {
        setShowZoom(true)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanUrl, page, bboxes])

  function drawCrop() {
    const canvas = canvasRef.current
    const pc     = pageCanvas.current
    if (!canvas || !pc) return
    const ctx = canvas.getContext("2d")!
    const { cx, cy, cw, ch } = cropRef.current
    const sz = DISPLAY_SIZE

    ctx.clearRect(0, 0, sz, sz)
    ctx.drawImage(pc, cx * pc.width, cy * pc.height, cw * pc.width, ch * pc.height, 0, 0, sz, sz)

    for (let i = 0; i < liveBoxes.current.length; i++) {
      const b  = liveBoxes.current[i]
      const bx = ((b.x - cx) / cw) * sz
      const by = ((b.y - cy) / ch) * sz
      const bw = (b.w / cw) * sz
      const bh = (b.h / ch) * sz

      ctx.strokeStyle = color
      ctx.lineWidth   = 2.5
      ctx.strokeRect(bx, by, bw, bh)

      ctx.fillStyle = color
      for (const [hx, hy] of [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]]) {
        ctx.fillRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE)
      }

      // Label only on first box
      if (i === 0) {
        ctx.font      = "bold 13px sans-serif"
        ctx.fillStyle = "rgba(0,0,0,0.65)"
        const tw = ctx.measureText(label).width + 10
        ctx.fillRect(bx, Math.max(0, by - 20), tw, 18)
        ctx.fillStyle = color
        ctx.fillText(label, bx + 5, Math.max(14, by - 6))
      }
    }

    ctx.font      = "11px sans-serif"
    ctx.fillStyle = "rgba(255,255,255,0.4)"
    ctx.fillText(
      zoomedRef.current
        ? "Drag background to pan  ·  drag box to move  ·  corners to resize"
        : "Drag box to move  ·  corners to resize",
      8, sz - 8,
    )
  }

  function pointerCoords(e: React.MouseEvent | React.TouchEvent): { mx: number; my: number } {
    const rect  = canvasRef.current!.getBoundingClientRect()
    const scale = DISPLAY_SIZE / rect.width
    if ("touches" in e) {
      const t = e.touches[0] ?? e.changedTouches[0]
      return { mx: (t.clientX - rect.left) * scale, my: (t.clientY - rect.top) * scale }
    }
    return { mx: (e.clientX - rect.left) * scale, my: (e.clientY - rect.top) * scale }
  }

  function onDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const { mx, my } = pointerCoords(e)
    const m = hitTest(mx, my, liveBoxes.current, cropRef.current, DISPLAY_SIZE)
    setMode(m?.type === "pan" && !zoomedRef.current ? null : m)
    dragOrigin.current = { mx, my }
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!mode || !dragOrigin.current) return
    const { mx, my } = pointerCoords(e)
    const dx = mx - dragOrigin.current.mx
    const dy = my - dragOrigin.current.my
    const { boxes, crop } = applyDelta(mode, liveBoxes.current, cropRef.current, dx, dy, DISPLAY_SIZE)
    liveBoxes.current  = boxes
    cropRef.current    = crop
    dragOrigin.current = { mx, my }
    drawCrop()
  }

  function onUp(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setMode(null)
    dragOrigin.current = null
  }

  function doZoomOut() {
    cropRef.current   = quarterCrop(liveBoxes.current, pageWRef.current, pageHRef.current)
    zoomedRef.current = true
    setZoomed(true)
    requestAnimationFrame(() => drawCrop())
  }

  function doZoomIn() {
    cropRef.current   = tightCrop(liveBoxes.current, pageWRef.current, pageHRef.current)
    zoomedRef.current = false
    setZoomed(false)
    requestAnimationFrame(() => drawCrop())
  }

  const cursor = mode?.type === "pan"    ? "grabbing"
    : mode?.type === "resize"
      ? (mode.corner === "nw" || mode.corner === "se" ? "nwse-resize" : "nesw-resize")
    : mode?.type === "move" ? "grabbing"
    : zoomed ? "grab" : "default"

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <canvas
        ref={canvasRef}
        width={DISPLAY_SIZE}
        height={DISPLAY_SIZE}
        style={{ borderRadius: 10, border: "1px solid #2a2a2a", cursor, maxWidth: "100%", touchAction: "none" }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      />
      <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {showZoom && !zoomed && (
            <button
              onClick={doZoomOut}
              style={{ padding: "7px 16px", borderRadius: 6, background: "#2a2a2a", color: "#aaa", border: "1px solid #3a3a3a", fontSize: 12, cursor: "pointer" }}
            >
              🔍 Zoom out
            </button>
          )}
          {zoomed && (
            <button
              onClick={doZoomIn}
              style={{ padding: "7px 16px", borderRadius: 6, background: "#2a2a2a", color: "#aaa", border: "1px solid #3a3a3a", fontSize: 12, cursor: "pointer" }}
            >
              ✕ Zoom in
            </button>
          )}
        </div>
        <button
          onClick={() => onConfirm(liveBoxes.current)}
          style={{ padding: "10px 28px", borderRadius: 8, background: "#4DB832", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Confirm position
        </button>
      </div>
    </div>
  )
}
