<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import LeftArcPanel  from '../components/LeftArcPanel.vue'
import RightArcPanel from '../components/RightArcPanel.vue'
import TimeWindow from '../components/TimeWindow.vue'
import { getWindowsForHour } from '../composables/useArcPanel.js'

const router = useRouter()

// Left arc: hours 1–12   Right arc: hours 13–23 + 0
const leftHours  = Array.from({ length: 12 }, (_, i) => i + 1)
const rightHours = Array.from({ length: 12 }, (_, i) => (i + 13) % 24)

function fmtHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

function goTo(hour) {
  router.push(`/detail/${hour}`)
}

// ── Arc-based per-row indentation ──────────────────────────────────
// Template refs to the ArcPanel instances; marks are exposed via defineExpose.
const leftArcRef  = ref(null)
const rightArcRef = ref(null)

// Left list: padding-right = W - cx  (large at middle → narrow rows there → ( shape on right edge)
const leftIndents = computed(() => {
  const w = leftArcRef.value?.panelW ?? 180
  return (leftArcRef.value?.marks ?? []).map(m => w - m.cx)
})
// Right list: padding-left = cx  (cx = W - rawX, large at middle → narrow rows there → ) shape on left edge)
const rightIndents = computed(() =>
  (rightArcRef.value?.marks ?? []).map(m => m.cx)
)
</script>

<template>
  <div class="page1">
    <!-- Page title -->
    <div class="page-title">24小时时间刻度盘</div>

    <div class="layout">
      <!-- ── Left List Column ── -->
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

      <!-- ── Right List Column ── -->
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

      <!-- ── 弧形面板：绝对定位于水平 50% 处，与列表列重叠，
               使弧线恰好贴合列表内容边缘（零间距）。
               ────────────────────────────────────────────
               【调整左侧弧度】修改 LeftArcPanel 的 :curvature 值（0.0～1.0）
               【调整右侧弧度】修改 RightArcPanel 的 :curvature 值（0.0～1.0）
               左右两侧弧度可以分别独立设置。
               ──────────────────────────────────────────── -->
      <div class="arc-col arc-col--left">
        <LeftArcPanel ref="leftArcRef" :hours="leftHours" @markClick="goTo" />
      </div>
      <div class="arc-col arc-col--right">
        <RightArcPanel ref="rightArcRef" :hours="rightHours" @markClick="goTo" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page1 {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 40%, #0e1a3a 0%, #07091a 100%);
}

.page-title {
  flex-shrink: 0;
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #60a8ff;
  background: rgba(8, 14, 40, 0.8);
  border-bottom: 1px solid rgba(42, 127, 255, 0.3);
}

.layout {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

/* Arc panels: absolutely centred at the 50% boundary so that the
   arc line sits exactly at the list-content edge (zero gap).
   left-arc right-edge = 50% ; right-arc left-edge = 50% */
.arc-col {
  position: absolute;
  width: 180px;
  top: 0;
  height: 100%;
}
.arc-col--left  { right: 50%; }
.arc-col--right { left:  50%; }

/* List columns – fill remaining space on each side */
.list-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

/* Each list row corresponds to one arc hour mark */
.list-row {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  min-height: 0;
}
.list-row:last-child { border-bottom: none; }

/* Time label bar at the top of each row */
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

/* Left list: right-align content (toward arc) */
.list-col--left .row-header { justify-content: flex-end; }
.list-col--left .scroll-box { justify-content: flex-end; }

/* Horizontal scroll box holding TimeWindow cards */
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
</style>
