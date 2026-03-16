<script setup>
import { useRouter } from 'vue-router'
import ArcPanel from '../components/ArcPanel.vue'
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
</script>

<template>
  <div class="page1">
    <!-- Page title -->
    <div class="page-title">24小时时间刻度盘</div>

    <div class="layout">
      <!-- ── Left List Column (arc is to the RIGHT of it) ── -->
      <div class="list-col">
        <div
          v-for="(hr, k) in leftHours"
          :key="k"
          class="list-row"
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

      <!-- ── Left Arc Panel ── -->
      <div class="arc-col">
        <ArcPanel :hours="leftHours" side="left" @markClick="goTo" />
      </div>

      <!-- ── Right Arc Panel ── -->
      <div class="arc-col">
        <ArcPanel :hours="rightHours" side="right" @markClick="goTo" />
      </div>

      <!-- ── Right List Column (arc is to the LEFT of it) ── -->
      <div class="list-col">
        <div
          v-for="(hr, k) in rightHours"
          :key="k"
          class="list-row"
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
  display: flex;
  flex-direction: row;
  min-height: 0;
}

/* Arc columns – fixed width, sit in the center pair */
.arc-col {
  flex-shrink: 0;
  width: 180px;
  height: 100%;
  position: relative;
}

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
