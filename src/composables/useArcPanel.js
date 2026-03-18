import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

/**
 * 弧形面板核心可组合函数
 *
 * @param {import('vue').Ref<number[]>} hoursRef      - 需要显示的小时数组（有序）
 * @param {'left'|'right'} side                       - 弧形方向：'left'=左弧，'right'=右弧
 * @param {import('vue').Ref<HTMLElement|null>} elRef  - 容器 DOM 元素的 ref
 * @param {import('vue').Ref<number>} [curvatureRef]  - 弧度系数（可选，默认 1.0）
 *
 * ────────────────────────────────────────────────────────────────
 * 【弧度系数（curvature）说明】
 *
 *   取值范围：0.0 ～ 1.0
 *     · 1.0（默认）：最深弧形，约等于 240° 椭圆弧
 *     · 0.5        ：中等弧形
 *     · 0.0        ：完全平直（弧线退化为垂直直线）
 *
 *   ✅ 修改弧度只会改变刻度的水平 (x) 位置。
 *      刻度的垂直 (y) 位置始终均匀分布，不受弧度影响。
 *      弧形两端也始终锚定在面板宽度的 50% 处，不会变形。
 *
 * 【如何修改弧度】
 *   方式一：通过 LeftArcPanel / RightArcPanel 组件的 curvature prop：
 *     <LeftArcPanel  :curvature="0.7" ... />
 *     <RightArcPanel :curvature="0.5" ... />
 *
 *   方式二：直接向本函数传入一个响应式 ref：
 *     const c = ref(0.7)
 *     useArcPanel(hours, 'left', el, c)
 *     // 之后修改 c.value 即可实时更新弧度
 * ────────────────────────────────────────────────────────────────
 */
export function useArcPanel(hoursRef, side, elRef, curvatureRef) {
  const panelW = ref(180)
  const panelH = ref(900)
  let ro = null

  // 若未传入弧度 ref，则使用默认值 1.0（最深弧形）
  const _curvature = curvatureRef ?? ref(1.0)

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

  /**
   * 计算椭圆弧上第 k 个刻度的「最深弧形」原始 x 坐标（即 curvature=1 时的位置）
   *
   * 椭圆方程：
   *   中心 (W, H/2)，水平半轴 rx = W，垂直半轴 ry = H/√3
   *   → 弧形两端（y=0 和 y=H）落在 x = W×0.5 处
   *   → 弧形中心（y=H/2）落在 x = 0 处（面板左边缘）
   *   → 这样弧形覆盖约 240° 的椭圆弧
   */
  function ovalXraw(k, N, W, H) {
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

    // 将弧度系数限制在合法范围 [0, 1]
    const c = Math.max(0, Math.min(1, _curvature.value))

    return hoursRef.value.map((hour, k) => {
      // 弧形两端的基准 x（顶部 y=0 和底部 y=H 处弧线所在的 x 位置）
      // 该值与弧度系数无关，始终为面板宽度的 50%
      const edgeX = W * 0.5

      // curvature=1 时刻度的完整弧形 x 坐标
      const rawX_full = ovalXraw(k, N, W, H)

      // 根据弧度系数在「平直」与「完整弧形」之间线性插值：
      //   c=0 → rawX = edgeX    （平直，所有刻度对齐端点基准线）
      //   c=1 → rawX = rawX_full（完整椭圆弧，弧形最深）
      const rawX = edgeX + (rawX_full - edgeX) * c

      // 左侧弧形：cx 越小表示弧线越靠左（对应列表 padding-right 越大）
      // 右侧弧形：cx 越大表示弧线越靠右（对应列表 padding-left 越大）
      const cx = side === 'left' ? rawX : W - rawX

      // 刻度垂直位置：均匀分布，完全不受弧度系数影响
      const cy = (k + 0.5) * H / N

      return { hour, cx, cy, k }
    })
  })

  /**
   * 通过 Catmull-Rom 样条连接所有刻度点，生成弧形 SVG 路径。
   * 路径两端延伸至 (W×0.5, 0) 和 (W×0.5, H)（即弧形的起止锚点）。
   * 弧形外观跟随 marks 自动更新，无需额外处理。
   */
  const arcPath = computed(() => {
    const W = panelW.value
    const H = panelH.value
    // 弧形两端均锚定在 x = W×0.5 处（与弧度系数无关）
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

/** Catmull-Rom 样条转换为 SVG 三次贝塞尔路径 */
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

// ─── 示例时间窗口数据 ─────────────────────────────────────────────────────────
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
  const count = 3 + (hour % 4)   // 每行 3～6 个时间窗口
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
