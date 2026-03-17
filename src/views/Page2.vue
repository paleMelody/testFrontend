<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import ArcPanel from '../components/ArcPanel.vue'
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

// Transition name driven by scroll direction
const transitionName = computed(() =>
  scrollDir.value > 0 ? 'shift-fwd' : 'shift-back'
)

// Stable reference hours for the static arc background (N=4 always → same geometry)
const bgHoursLeft  = [0, 1, 2, 3]
const bgHoursRight = [4, 5, 6, 7]

// ── Arc-based per-row indentation ──────────────────────────────────
// Use the static bg arc panels (always in DOM) as the source of mark geometry.
const bgLeftArcRef  = ref(null)
const bgRightArcRef = ref(null)

// Left list rows: indent from RIGHT by rawX (= cx on left arc)
const leftIndents = computed(() =>
  (bgLeftArcRef.value?.marks ?? []).map(m => m.cx)
)
// Right list rows: indent from LEFT by rawX (= panelW - cx on right arc)
const rightIndents = computed(() => {
  const w = bgRightArcRef.value?.panelW ?? 180
  return (bgRightArcRef.value?.marks ?? []).map(m => w - m.cx)
})

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
      <!-- ── STATIC LAYER: arc curves + tick lines, never animated ── -->
      <div class="layout layout--bg">
        <div class="list-spacer" />
        <div class="arc-col">
          <ArcPanel ref="bgLeftArcRef"  :hours="bgHoursLeft"  side="left"  :show-dots="false" />
        </div>
        <div class="arc-col">
          <ArcPanel ref="bgRightArcRef" :hours="bgHoursRight" side="right" :show-dots="false" />
        </div>
        <div class="list-spacer" />
      </div>

      <!-- ── ANIMATED LAYER: dots + list rows slide in/out on scroll ── -->
      <Transition :name="transitionName">
        <div :key="startHour" class="layout layout--fg">
          <!-- Left list column -->
          <div class="list-col list-col--left">
            <div
              v-for="(hr, k) in leftHours"
              :key="k"
              class="list-row"
              :style="{ paddingRight: (leftIndents[k] ?? 0) + 'px' }"
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
          </div>

          <!-- Left arc dots + labels (wheel shifts time window) -->
          <div class="arc-col" @wheel.prevent="onArcWheel">
            <ArcPanel
              :hours="leftHours"
              side="left"
              :show-arc="false"
              :activeHours="allActive"
              @markClick="goTo"
            />
          </div>

          <!-- Right arc dots + labels -->
          <div class="arc-col" @wheel.prevent="onArcWheel">
            <ArcPanel
              :hours="rightHours"
              side="right"
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
              :style="{ paddingLeft: (rightIndents[k] ?? 0) + 'px' }"
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
          </div>
        </div>
      </Transition>
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

/* Spacers in the bg layer match the list-col flex sizing */
.list-spacer {
  flex: 1;
  min-width: 0;
}

/* Arc columns – same width in both layers so positions align exactly */
.arc-col {
  flex-shrink: 0;
  width: 180px;
  height: 100%;
  position: relative;
  cursor: ns-resize;
}

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
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 0;
}
.list-row:last-child { border-bottom: none; }

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

/* ── Slide animations (dots + list only; arc curves stay) ── */

/* shift-fwd: time increases → old exits up, new enters from below */
.shift-fwd-enter-from {
  transform: translateY(35%);
  opacity: 0;
}
.shift-fwd-enter-active {
  transition: transform 0.38s ease, opacity 0.35s;
}
.shift-fwd-leave-to {
  transform: translateY(-35%);
  opacity: 0;
}
.shift-fwd-leave-active {
  transition: transform 0.38s ease, opacity 0.35s;
}

/* shift-back: time decreases → old exits down, new enters from above */
.shift-back-enter-from {
  transform: translateY(-35%);
  opacity: 0;
}
.shift-back-enter-active {
  transition: transform 0.38s ease, opacity 0.35s;
}
.shift-back-leave-to {
  transform: translateY(35%);
  opacity: 0;
}
.shift-back-leave-active {
  transition: transform 0.38s ease, opacity 0.35s;
}
</style>
