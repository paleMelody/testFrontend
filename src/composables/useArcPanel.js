import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

/**
 * Returns reactive mark positions and SVG arc path for a 240° arc panel.
 * @param {import('vue').Ref<number[]>} hoursRef  – ordered list of hours to display
 * @param {'left'|'right'} side
 * @param {import('vue').Ref<HTMLElement|null>} elRef – ref to the container DOM element
 */
export function useArcPanel(hoursRef, side, elRef) {
  const panelW = ref(180)
  const panelH = ref(900)
  let ro = null

  function measure() {
    const el = elRef.value
    if (!el) return
    panelW.value = el.clientWidth
    panelH.value = el.clientHeight
  }

  onMounted(() => {
    measure()
    ro = new ResizeObserver(measure)
    if (elRef.value) ro.observe(elRef.value)
  })

  watch(elRef, (el) => {
    if (el) { measure(); ro?.observe(el) }
    else ro?.disconnect()
  })

  onUnmounted(() => ro?.disconnect())

  /** x position on the 240° oval arc for the k-th mark of N total */
  function ovalXraw(k, N, W, H) {
    // Oval: center (W, H/2), rx = W, ry = H/sqrt(3)
    // → endpoints (y=0 and y=H) land at x = W*0.5 → ~240° visible arc
    const ry = H / Math.sqrt(3)
    const cy = H / 2
    const y  = (k + 0.5) * H / N
    const dy = y - cy
    const disc = Math.max(0, 1 - (dy * dy) / (ry * ry))
    return Math.max(1, W - W * Math.sqrt(disc))
  }

  const marks = computed(() => {
    const N = hoursRef.value.length
    const W = panelW.value
    const H = panelH.value
    return hoursRef.value.map((hour, k) => {
      const rawX = ovalXraw(k, N, W, H)
      const cx   = side === 'left' ? rawX : W - rawX
      const cy   = (k + 0.5) * H / N
      return { hour, cx, cy, k }
    })
  })

  /** SVG path through all mark positions + top/bottom arc extensions */
  const arcPath = computed(() => {
    const W = panelW.value
    const H = panelH.value
    // At panel top/bottom, the 240° oval arc is at x = W*0.5
    const edgeX = W * 0.5
    const pts = [
      { x: edgeX, y: 0 },
      ...marks.value.map(m => ({ x: m.cx, y: m.cy })),
      { x: edgeX, y: H },
    ]
    return catmullRomPath(pts)
  })

  return { panelW, panelH, marks, arcPath }
}

/** Catmull-Rom spline → cubic bezier SVG path */
function catmullRomPath(pts) {
  if (pts.length < 2) return ''
  const f = (n) => n.toFixed(2)
  const d = [`M ${f(pts[0].x)} ${f(pts[0].y)}`]
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)]
    const p1 = pts[i - 1]
    const p2 = pts[i]
    const p3 = pts[Math.min(pts.length - 1, i + 1)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${f(cp1x)} ${f(cp1y)} ${f(cp2x)} ${f(cp2y)} ${f(p2.x)} ${f(p2.y)}`)
  }
  return d.join(' ')
}

// ─── Sample window data ────────────────────────────────────────────────────────
const PALETTES = [
  { bg: '#0d2240', border: '#2080c0' },
  { bg: '#0d2a14', border: '#30b050' },
  { bg: '#2a1008', border: '#c04010' },
  { bg: '#1a0d2a', border: '#8040c0' },
  { bg: '#0a1e2e', border: '#20a0b0' },
  { bg: '#2a1a08', border: '#c08020' },
  { bg: '#0d1a2a', border: '#2060d0' },
  { bg: '#1e0a10', border: '#c03060' },
]

const CONTENTS = [
  '新闻联播', '体育频道', '综艺节目', '纪录片',
  '影视频道', '财经资讯', '音乐频道', '少儿节目',
  '科教频道', '生活服务',
]

export function getWindowsForHour(hour) {
  const count = 3 + (hour % 4)   // 3–6 windows per row
  return Array.from({ length: count }, (_, i) => {
    const pal = PALETTES[(hour + i) % PALETTES.length]
    return {
      id: `h${hour}-w${i}`,
      title: `CH${((hour * 3 + i) % 30) + 1} · ${CONTENTS[(hour + i * 2) % CONTENTS.length]}`,
      content: `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`,
      bg: pal.bg,
      borderColor: pal.border,
    }
  })
}
