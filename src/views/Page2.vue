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

// ── Wheel → shift time window ───────────────────────────────────────
function onArcWheel(e) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 1 : -1
  startHour.value = ((startHour.value + delta) + 24) % 24
}

// ── Navigation ──────────────────────────────────────────────────────
function goTo(hour) {
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

    <div class="layout">
      <!-- ── Left Arc Panel ── (wheel = shift window) -->
      <div class="arc-col" @wheel.prevent="onArcWheel">
        <ArcPanel
          :hours="leftHours"
          side="left"
          :activeHours="allActive"
          @markClick="goTo"
        />
      </div>

      <!-- ── Center Scroll Area ── -->
      <div class="scroll-area">
        <div
          v-for="(_, k) in leftHours"
          :key="k"
          class="scroll-row"
        >
          <!-- Left scroll box -->
          <div class="scroll-box">
            <TimeWindow
              v-for="w in getWindowsForHour(leftHours[k])"
              :key="w.id"
              :config="w"
            />
          </div>
          <div class="row-divider" />
          <!-- Right scroll box -->
          <div class="scroll-box">
            <TimeWindow
              v-for="w in getWindowsForHour(rightHours[k])"
              :key="w.id"
              :config="w"
            />
          </div>
        </div>
      </div>

      <!-- ── Right Arc Panel ── (wheel = shift window) -->
      <div class="arc-col" @wheel.prevent="onArcWheel">
        <ArcPanel
          :hours="rightHours"
          side="right"
          :activeHours="allActive"
          @markClick="goTo"
        />
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

/* ── Layout ── */
.layout {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

.arc-col {
  flex-shrink: 0;
  width: 180px;
  height: 100%;
  position: relative;
  cursor: ns-resize;
}

/* ── Scroll area ── */
.scroll-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-left:  1px solid rgba(42, 127, 255, 0.2);
  border-right: 1px solid rgba(42, 127, 255, 0.2);
}

.scroll-row {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 0;
}
.scroll-row:last-child { border-bottom: none; }

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

.row-divider {
  flex-shrink: 0;
  width: 1px;
  align-self: stretch;
  margin: 6px 0;
  background: rgba(42, 127, 255, 0.2);
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
</style>
