<script setup>
import { ref, computed, getCurrentInstance } from 'vue'
import { useArcPanel } from '../composables/useArcPanel.js'

const props = defineProps({
  hours:       { type: Array,   required: true },
  side:        { type: String,  required: true }, // 'left' | 'right'
  activeHours: { type: Array,   default: () => [] }, // hours to highlight
  showArc:     { type: Boolean, default: true  }, // render arc curve + tick lines
  showDots:    { type: Boolean, default: true  }, // render dots, rings, labels
})

const emit = defineEmits(['markClick'])

const wrapEl = ref(null)

const hoursRef = computed(() => props.hours)
const { panelW, panelH, marks, arcPath } = useArcPanel(hoursRef, props.side, wrapEl)

function fmtHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

// Unique filter ID per component instance to avoid SVG ID collisions
const uid = getCurrentInstance()?.uid ?? 0
const filterId = `glow-${props.side}-${uid}`

// Expose marks and panel width so parent pages can compute per-row arc indentation
defineExpose({ marks, panelW })
</script>

<template>
  <div class="arc-panel-wrap" ref="wrapEl">
    <svg
      class="arc-svg"
      :viewBox="`0 0 ${panelW} ${panelH}`"
      preserveAspectRatio="none"
    >
      <defs>
        <filter :id="filterId" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter :id="`${filterId}-active`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Static layer: arc curve + tick lines pointing toward the list -->
      <template v-if="showArc">
        <path :d="arcPath" class="arc-line" :filter="`url(#${filterId})`" />
        <!-- Tick lines point TOWARD the adjacent list column -->
        <line
          v-for="m in marks" :key="`tick-${m.hour}`"
          :x1="m.cx" :y1="m.cy"
          :x2="side === 'left' ? 0 : panelW" :y2="m.cy"
          class="tick-line"
        />
      </template>

      <!-- Animated layer: glow rings + clickable dots -->
      <template v-if="showDots">
        <circle
          v-for="m in marks" :key="`ring-${m.hour}`"
          v-show="activeHours.includes(m.hour)"
          :cx="m.cx" :cy="m.cy" r="10"
          class="mark-ring"
          :filter="`url(#${filterId}-active)`"
        />
        <circle
          v-for="m in marks" :key="`dot-${m.hour}`"
          :cx="m.cx" :cy="m.cy" r="5"
          class="mark-dot"
          :class="{ 'mark-dot--active': activeHours.includes(m.hour) }"
          :filter="`url(#${filterId})`"
          @click="emit('markClick', m.hour)"
        />
      </template>
    </svg>

    <!-- Animated layer: HTML time labels on the concave (inner) side of the arc -->
    <template v-if="showDots">
      <div
        v-for="m in marks"
        :key="`lbl-${m.hour}`"
        class="mark-label"
        :class="[`mark-label--${side}`, { 'mark-label--active': activeHours.includes(m.hour) }]"
        :style="side === 'left'
          ? { top: m.cy + 'px', left:  (m.cx + 10) + 'px' }
          : { top: m.cy + 'px', right: (panelW - m.cx + 10) + 'px' }"
        @click="emit('markClick', m.hour)"
      >{{ fmtHour(m.hour) }}</div>
    </template>
  </div>
</template>

<style scoped>
.arc-panel-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.arc-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.arc-line {
  fill: none;
  stroke: #2a7fff;
  stroke-width: 2;
  opacity: 0.85;
}
.tick-line {
  stroke: rgba(42, 127, 255, 0.2);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.mark-ring {
  fill: none;
  stroke: #60ffcc;
  stroke-width: 2;
  opacity: 0.6;
}
.mark-dot {
  fill: #60b8ff;
  cursor: pointer;
  transition: fill 0.15s, r 0.15s;
}
.mark-dot:hover { fill: #ffffff; }
.mark-dot--active {
  fill: #60ffcc;
}

.mark-label {
  position: absolute;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 700;
  color: #80c8ff;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  letter-spacing: 0.5px;
  transition: color 0.15s;
  pointer-events: auto;
}
.mark-label:hover { color: #ffffff; }
.mark-label--active { color: #60ffcc; }
</style>

