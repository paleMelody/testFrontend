<script setup>
import { useRouter } from 'vue-router'
import ArcPanel from '../components/ArcPanel.vue'
import TimeWindow from '../components/TimeWindow.vue'
import { getWindowsForHour } from '../composables/useArcPanel.js'

const router = useRouter()

// Left arc: hours 1–12   Right arc: hours 13–23 + 0
const leftHours  = Array.from({ length: 12 }, (_, i) => i + 1)
const rightHours = Array.from({ length: 12 }, (_, i) => (i + 13) % 24)

function goTo(hour) {
  router.push(`/detail/${hour}`)
}
</script>

<template>
  <div class="page1">
    <!-- Page title -->
    <div class="page-title">24小时时间刻度盘</div>

    <div class="layout">
      <!-- ── Left Arc Panel ── -->
      <div class="arc-col arc-col--left">
        <ArcPanel :hours="leftHours" side="left" @markClick="goTo" />
      </div>

      <!-- ── Center Scroll Area ── -->
      <div class="scroll-area">
        <div
          v-for="(_, k) in leftHours"
          :key="k"
          class="scroll-row"
        >
          <!-- Left scroll box (left arc hour) -->
          <div class="scroll-box">
            <TimeWindow
              v-for="w in getWindowsForHour(leftHours[k])"
              :key="w.id"
              :config="w"
            />
          </div>
          <div class="row-divider" />
          <!-- Right scroll box (right arc hour) -->
          <div class="scroll-box">
            <TimeWindow
              v-for="w in getWindowsForHour(rightHours[k])"
              :key="w.id"
              :config="w"
            />
          </div>
        </div>
      </div>

      <!-- ── Right Arc Panel ── -->
      <div class="arc-col arc-col--right">
        <ArcPanel :hours="rightHours" side="right" @markClick="goTo" />
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

/* Arc columns */
.arc-col {
  flex-shrink: 0;
  width: 180px;
  height: 100%;
  position: relative;
}

/* Scroll area */
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
  margin: 4px 0;
  background: rgba(42, 127, 255, 0.2);
}
</style>
