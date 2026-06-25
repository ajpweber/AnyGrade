"use client"

import { useEffect, useRef, useState } from "react"
import type { BBox } from "@/app/api/grade/types"

type Props = {
  scanUrl: string
  page: number        // 1-based
  bbox: BBox
  label: string
  color: string
  onConfirm: (corrected: BBox) => void
}

type DragMode =
  | { type: "move" }
  | { type: "resize"; corner: "nw" | "ne" | "se" | "sw" }
  | { type: "pan" }
  | null

const PADDING      = 0.15  // page-fraction padding around bbox for tight crop
const ZOOM_FACTOR  = 3     // zoom-out shows 3× more context, same scale ratio
const DISPLAY_SIZE = 420   // canvas px (square)
const HANDLE       = 12    // corner handle hit area px
const BLANK_THRESH = 0.65  // fraction of near-white pixels that triggers zoom button

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

function hitMode(
  mx: number, my: number,
  bx: number, by: number, bw: number, bh: number,
): DragMode {
  const nearCorner = (px: number, py: number) =>
    Math.abs(mx - px) <= HANDLE && Math.abs(my - py) <= HANDLE
  if (nearCorner(bx,      by))      return { type: "resize", corner: "nw" }
  if (nearCorner(bx + bw, by))      return { type: "resize", corner: "ne" }
  if (nearCorner(bx + bw, by + bh)) return { type: "resize", corner: "se" }
  if (nearCorner(bx,      by + bh)) return { type: "resize", corner: "sw" }
  if (mx >= bx - 8 && mx <= bx + bw + 8 && my >= by - 8 && my <= by + bh + 8)
    return { type: "move" }
  return { type: "pan" }
}

function applyDelta(
  mode: DragMode, lb: BBox, crop: { cx: number; cy: number; cw: number; ch: number },
  dx: number, dy: number, sz: number,
): { lb: BBox; crop: typeof crop } {
  const MIN = 0.01
  const dfx = (dx / sz) * crop.cw
  const dfy = (dy / sz) * crop.ch

  if (mode?.type === "pan") {
    const cx = clamp(crop.cx - dfx, 0, 1 - crop.cw)
    const cy = clamp(crop.cy - dfy, 0, 1 - crop.ch)
    return { lb, crop: { ...crop, cx, cy } }
  }

  if (mode?.type === "move") {
    return {
      lb: { ...lb, x: clamp(lb.x + dfx, 0, 1 - lb.w), y: clamp(lb.y + dfy, 0, 1 - lb.h) },
      crop,
    }
  }

  if (mode?.type === "resize") {
    let { x, y, w, h } = lb
    switch (mode.corner) {
      case "nw": x += dfx; y += dfy; w -= dfx; h -= dfy; break
      case "ne":            y += dfy; w += dfx; h -= dfy; break
      case "se":                      w += dfx; h += dfy; break
      case "sw": x += dfx;            w -= dfx; h += dfy; break
    }
    w = Math.max(MIN, w); h = Math.max(MIN, h)
    x = clamp(x, 0, 1 - w); y = clamp(y, 0, 1 - h)
    return { lb: { ...lb, x, y, w, h }, crop }
  }

  return { lb, crop }
}

// Returns fraction of canvas pixels that are near-white (blank paper)
function blankFraction(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d")!
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let white = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) white++
  }
  return white / (data.length / 4)
}

export function CropAnnotation({ scanUrl, page, bbox, label, color, onConfirm }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const [mode, setMode]         = useState<DragMode>(null)
  const [zoomed, setZoomed]     = useState(false)
  const [showZoom, setShowZoom] = useState(false)
  const zoomedRef    = useRef(false)
  const dragOrigin   = useRef<{ mx: number; my: number } | null>(null)
  const pageCanvas   = useRef<HTMLCanvasElement | null>(null)
  const cropRef      = useRef({ cx: 0, cy: 0, cw: 0, ch: 0 })
  const tightCropRef = useRef({ cx: 0, cy: 0, cw: 0, ch: 0 })
  const liveBox      = useRef<BBox>({ ...bbox })

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
      liveBox.current = { ...bbox }

      // Tight crop: bbox + PADDING on each side
      const cw = Math.min(1, bbox.w + PADDING * 2)
      const ch = Math.min(1, bbox.h + PADDING * 2)
      const cx = clamp(bbox.x - PADDING, 0, 1 - cw)
      const cy = clamp(bbox.y - PADDING, 0, 1 - ch)
      const tight = { cx, cy, cw, ch }
      cropRef.current      = tight
      tightCropRef.current = tight

      drawCrop()

      // Show zoom button only if tight crop is mostly blank paper
      if (canvasRef.current && blankFraction(canvasRef.current) > BLANK_THRESH) {
        setShowZoom(true)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanUrl, page, bbox])

  function drawCrop() {
    const canvas = canvasRef.current
    const pc     = pageCanvas.current
    if (!canvas || !pc) return
    const ctx = canvas.getContext("2d")!
    const { cx, cy, cw, ch } = cropRef.current
    const sz = DISPLAY_SIZE

    ctx.clearRect(0, 0, sz, sz)
    ctx.drawImage(pc, cx * pc.width, cy * pc.height, cw * pc.width, ch * pc.height, 0, 0, sz, sz)

    const lb = liveBox.current
    const bx = ((lb.x - cx) / cw) * sz
    const by = ((lb.y - cy) / ch) * sz
    const bw = (lb.w / cw) * sz
    const bh = (lb.h / ch) * sz

    ctx.strokeStyle = color
    ctx.lineWidth   = 2.5
    ctx.strokeRect(bx, by, bw, bh)

    ctx.fillStyle = color
    for (const [hx, hy] of [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]]) {
      ctx.fillRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE)
    }

    ctx.font = "bold 13px sans-serif"
    ctx.fillStyle = "rgba(0,0,0,0.65)"
    const tw = ctx.measureText(label).width + 10
    ctx.fillRect(bx, Math.max(0, by - 20), tw, 18)
    ctx.fillStyle = color
    ctx.fillText(label, bx + 5, Math.max(14, by - 6))

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
    const lb = liveBox.current
    const { cx, cy, cw, ch } = cropRef.current
    const sz = DISPLAY_SIZE
    const bx = ((lb.x - cx) / cw) * sz
    const by = ((lb.y - cy) / ch) * sz
    const bw = (lb.w / cw) * sz
    const bh = (lb.h / ch) * sz
    const m  = hitMode(mx, my, bx, by, bw, bh)
    setMode(m?.type === "pan" && !zoomedRef.current ? null : m)
    dragOrigin.current = { mx, my }
  }

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!mode || !dragOrigin.current) return
    const { mx, my } = pointerCoords(e)
    const dx = mx - dragOrigin.current.mx
    const dy = my - dragOrigin.current.my
    const { lb, crop } = applyDelta(mode, liveBox.current, cropRef.current, dx, dy, DISPLAY_SIZE)
    liveBox.current    = lb
    cropRef.current    = crop
    dragOrigin.current = { mx, my }
    drawCrop()
  }

  function onUp(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setMode(null)
    dragOrigin.current = null
  }

  function zoomOut() {
    const { cw: tcw, ch: tch } = tightCropRef.current
    const lb = liveBox.current
    const cw = Math.min(1, tcw * ZOOM_FACTOR)
    const ch = Math.min(1, tch * ZOOM_FACTOR)
    const cx = clamp(lb.x + lb.w / 2 - cw / 2, 0, 1 - cw)
    const cy = clamp(lb.y + lb.h / 2 - ch / 2, 0, 1 - ch)
    cropRef.current    = { cx, cy, cw, ch }
    zoomedRef.current  = true
    setZoomed(true)
    requestAnimationFrame(() => drawCrop())
  }

  function zoomIn() {
    cropRef.current   = { ...tightCropRef.current }
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
              onClick={zoomOut}
              style={{ padding: "7px 16px", borderRadius: 6, background: "#2a2a2a", color: "#aaa", border: "1px solid #3a3a3a", fontSize: 12, cursor: "pointer" }}
            >
              🔍 Zoom out
            </button>
          )}
          {zoomed && (
            <button
              onClick={zoomIn}
              style={{ padding: "7px 16px", borderRadius: 6, background: "#2a2a2a", color: "#aaa", border: "1px solid #3a3a3a", fontSize: 12, cursor: "pointer" }}
            >
              ✕ Zoom in
            </button>
          )}
        </div>
        <button
          onClick={() => onConfirm(liveBox.current)}
          style={{ padding: "10px 28px", borderRadius: 8, background: "#4DB832", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Confirm position
        </button>
      </div>
    </div>
  )
}
