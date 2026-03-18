<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import LeftArcPanel  from '../components/LeftArcPanel.vue'
import RightArcPanel from '../components/RightArcPanel.vue'
import TimeWindow from '../components/TimeWindow.vue'
import { getWindowsForHour } from '../composables/useArcPanel.js'

const props = defineProps({ hour: { type: String, required: true } })
const router = useRouter()

// ── State ──────────────────────────────────────────────────────────
const startHour = ref(Number(props.hour) % 24)
const scrollDir = ref(1) // 1 = time forward, -1 = time backward

// Sync startHour when the route param changes (same component reused)
watch(() => props.hour, (h) => {
  startHour.value = Number(h) % 24
})

// 8 consecutive hours starting from startHour (wrapping at 24)
const windowHours = computed(() =>
  Array.from({ length: 8 }, (_, i) => (startHour.value + i) % 24)
)

// Split 8 hours: left arc = first 4, right arc = last 4
const leftHours  = computed(() => windowHours.value.slice(0, 4))
const rightHours = computed(() => windowHours.value.slice(4))

// All 8 hours are "active" (highlight their marks on the arc)
const allActive = computed(() => windowHours.value)

function fmtHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}
const topLeft     = computed(() => fmtHour(leftHours.value[0]))
const bottomRight = computed(() => fmtHour((startHour.value + 8) % 24))

// Stagger delay for per-row animation: rows ripple in the scroll direction
const ROW_STAGGER_MS = 50   // ms between consecutive rows
function rowDelay(k, n) {
  return (scrollDir.value > 0 ? k : n - 1 - k) * ROW_STAGGER_MS
}

// Stable reference hours for the static arc background (N=4 always → same geometry)
const bgHoursLeft  = [0, 1, 2, 3]
const bgHoursRight = [4, 5, 6, 7]

// ── Arc-based per-row indentation ──────────────────────────────────
// Use the static bg arc panels (always in DOM) as the source of mark geometry.
const bgLeftArcRef  = ref(null)
const bgRightArcRef = ref(null)

// Left list rows: padding-right = W - cx  (large at middle → ( shape on right edge)
const leftIndents = computed(() => {
  const w = bgLeftArcRef.value?.panelW ?? 180
  return (bgLeftArcRef.value?.marks ?? []).map(m => w - m.cx)
})
// Right list rows: padding-left = cx  (cx = W - rawX, large at middle → ) shape on left edge)
const rightIndents = computed(() =>
  (bgRightArcRef.value?.marks ?? []).map(m => m.cx)
)

// Debounce timestamp – plain variable, intentionally non-reactive
let lastScrollTime = 0
function onArcWheel(e) {
  e.preventDefault()
  const now = Date.now()
  if (now - lastScrollTime < 380) return
  lastScrollTime = now
  const delta = e.deltaY > 0 ? 1 : -1
  scrollDir.value = delta
  startHour.value = ((startHour.value + delta) + 24) % 24
}

// ── Navigation ──────────────────────────────────────────────────────
function goTo(hour) {
  scrollDir.value = 1
  startHour.value = hour % 24
}
function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="page2">
    <!-- Header bar -->
    <div class="header-bar">
      <button class="back-btn" @click="goBack">← 返回</button>
      <span class="header-title">详细时刻表</span>
      <span class="header-range">
        <span class="range-start">{{ topLeft }}</span>
        <span class="range-arrow"> → </span>
        <span class="range-end">{{ bottomRight }}</span>
      </span>
      <span class="scroll-hint">· 在时间刻度区域滚动鼠标可切换时间窗口</span>
    </div>

    <div class="layout-wrapper">
      <!-- ── 静态层：弧线 + 刻度连线，不参与动画。
               ────────────────────────────────────────────────
               【调整左侧弧度】修改 LeftArcPanel  的 :curvature 值（0.0～1.0）
               【调整右侧弧度】修改 RightArcPanel 的 :curvature 值（0.0～1.0）
               注意：前景层（fg）的同侧弧度需保持一致，否则刻度点与弧线会错位。
               ──────────────────────────────────────────────── -->
      <div class="layout layout--bg">
        <div class="arc-col arc-col--left">
          <LeftArcPanel  ref="bgLeftArcRef"  :hours="bgHoursLeft"  :show-dots="false" />
        </div>
        <div class="arc-col arc-col--right">
          <RightArcPanel ref="bgRightArcRef" :hours="bgHoursRight" :show-dots="false" />
        </div>
      </div>

      <!-- ── FOREGROUND LAYER: list rows + arc dots, each row animates independently ── -->
      <div class="layout layout--fg">
          <!-- Left list column -->
          <div class="list-col list-col--left">
            <div
              v-for="(hr, k) in leftHours"
              :key="k"
              class="list-row"
            >
              <Transition :name="scrollDir > 0 ? 'row-fwd' : 'row-back'">
                <div
                  :key="hr"
                  class="row-content"
                  :style="{
                    paddingRight: (leftIndents[k] ?? 0) + 'px',
                    '--delay': rowDelay(k, leftHours.length) + 'ms'
                  }"
                >
                  <div class="row-header">
                    <span class="row-hour">{{ fmtHour(hr) }}</span>
                  </div>
                  <div class="scroll-box">
                    <TimeWindow
                      v-for="w in getWindowsForHour(hr)"
                      :key="w.id"
                      :config="w"
                    />
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- 左侧弧形刻度点 + 标签（在此区域滚动鼠标可切换时间窗口） -->
          <!-- 注意：左弧列放在左侧列表列之后，确保它在同一层叠上下文中绘制于上方，
               从而能正确接收鼠标滚轮事件 -->
          <div class="arc-col arc-col--left" @wheel.prevent="onArcWheel">
            <LeftArcPanel
              :hours="leftHours"
              :show-arc="false"
              :activeHours="allActive"
              @markClick="goTo"
            />
          </div>

          <!-- Right list column -->
          <div class="list-col list-col--right">
            <div
              v-for="(hr, k) in rightHours"
              :key="k"
              class="list-row"
            >
              <Transition :name="scrollDir > 0 ? 'row-fwd' : 'row-back'">
                <div
                  :key="hr"
                  class="row-content"
                  :style="{
                    paddingLeft: (rightIndents[k] ?? 0) + 'px',
                    '--delay': rowDelay(k, rightHours.length) + 'ms'
                  }"
                >
                  <div class="row-header">
                    <span class="row-hour">{{ fmtHour(hr) }}</span>
                  </div>
                  <div class="scroll-box">
                    <TimeWindow
                      v-for="w in getWindowsForHour(hr)"
                      :key="w.id"
                      :config="w"
                    />
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <!-- 右侧弧形刻度点 + 标签放在右侧列表列之后，
               保证在同一层叠上下文中绘制于上方，
               从而能正确接收鼠标滚轮事件（修复右侧弧线附近无法滚动的问题） -->
          <div class="arc-col arc-col--right" @wheel.prevent="onArcWheel">
            <RightArcPanel
              :hours="rightHours"
              :show-arc="false"
              :activeHours="allActive"
              @markClick="goTo"
            />
          </div>
        </div>
    </div>

    <!-- Corner time labels -->
    <div class="corner-label corner-label--tl">{{ topLeft }}</div>
    <div class="corner-label corner-label--br">{{ bottomRight }}</div>
  </div>
</template>

<style scoped>
.page2 {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 60%, #0e2040 0%, #07091a 100%);
}

/* ── Header ── */
.header-bar {
  flex-shrink: 0;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: rgba(8, 16, 44, 0.9);
  border-bottom: 1px solid rgba(42, 127, 255, 0.3);
  z-index: 10;
}
.back-btn {
  background: rgba(42, 127, 255, 0.15);
  border: 1px solid rgba(42, 127, 255, 0.4);
  color: #80b8ff;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}
.back-btn:hover { background: rgba(42, 127, 255, 0.3); color: #fff; }
.header-title {
  font-size: 14px;
  font-weight: 700;
  color: #60a8ff;
  letter-spacing: 1px;
}
.header-range { font-size: 14px; font-weight: 600; }
.range-start { color: #60ffb8; }
.range-end   { color: #ff9060; }
.range-arrow { color: #304050; }
.scroll-hint {
  font-size: 11px;
  color: #304858;
  margin-left: auto;
}

/* ── Layout wrapper ── */
.layout-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

/* Both layout layers fill the wrapper absolutely */
.layout {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
}

/* Static background: arc curves never move */
.layout--bg {
  z-index: 1;
  pointer-events: none;
}

/* Animated foreground: dots + list content */
.layout--fg {
  z-index: 2;
}

/* Arc panels: absolutely centred at 50% boundary (same in bg + fg layers).
   left-arc right-edge = 50% ; right-arc left-edge = 50%
   This makes the arc line sit exactly at the list-content edge (zero gap). */
.arc-col {
  position: absolute;
  width: 180px;
  top: 0;
  height: 100%;
  cursor: ns-resize;
}
.arc-col--left  { right: 50%; }
.arc-col--right { left:  50%; }

/* List columns */
.list-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

/* Left list: right-align content (toward arc) */
.list-col--left .row-header { justify-content: flex-end; }
.list-col--left .scroll-box { justify-content: flex-end; }

.list-row {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 0;
}
.list-row:last-child { border-bottom: none; }

/* Inner content wrapper – absolutely fills the row slot so that the
   entering and leaving elements can slide past each other. Padding
   here (not on list-row) controls the arc-hugging indentation. */
.row-content {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
}

.row-header {
  flex-shrink: 0;
  height: 18px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  background: rgba(6, 14, 36, 0.6);
  border-bottom: 1px solid rgba(42, 127, 255, 0.1);
}

.row-hour {
  font-size: 10px;
  font-weight: 700;
  color: #4a90d0;
  letter-spacing: 0.5px;
}

.scroll-box {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(42, 127, 255, 0.4) transparent;
  padding: 0 4px;
}
.scroll-box::-webkit-scrollbar { height: 4px; }
.scroll-box::-webkit-scrollbar-thumb {
  background: rgba(42, 127, 255, 0.4);
  border-radius: 2px;
}

/* ── Corner labels ── */
.corner-label {
  position: absolute;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 3px;
  pointer-events: none;
  z-index: 10;
}
.corner-label--tl {
  top: 50px;
  left: 6px;
  color: #60ffb8;
  background: rgba(0, 60, 30, 0.6);
  border: 1px solid rgba(60, 200, 100, 0.4);
}
.corner-label--br {
  bottom: 6px;
  right: 6px;
  color: #ff9060;
  background: rgba(60, 20, 0, 0.6);
  border: 1px solid rgba(200, 80, 30, 0.4);
}

/* ── Per-row slide animations ── */
/* Each row's content slides independently, staggered via --delay. */

/* row-fwd: time increases → old exits upward, new enters from below */
.row-fwd-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.row-fwd-enter-active {
  transition: transform 0.32s cubic-bezier(.25,.8,.25,1), opacity 0.28s;
  transition-delay: var(--delay, 0ms);
}
.row-fwd-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
.row-fwd-leave-active {
  transition: transform 0.32s cubic-bezier(.25,.8,.25,1), opacity 0.28s;
  transition-delay: var(--delay, 0ms);
}

/* row-back: time decreases → old exits downward, new enters from above */
.row-back-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}
.row-back-enter-active {
  transition: transform 0.32s cubic-bezier(.25,.8,.25,1), opacity 0.28s;
  transition-delay: var(--delay, 0ms);
}
.row-back-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
.row-back-leave-active {
  transition: transform 0.32s cubic-bezier(.25,.8,.25,1), opacity 0.28s;
  transition-delay: var(--delay, 0ms);
}
</style>
