<script setup>
/**
 * ============================================================
 * 右侧弧形面板组件（RightArcPanel）
 *
 * 本组件是从 ArcPanel 拆分出来的独立右弧组件，弧形方向固定为右侧。
 * 左侧对应组件请参见 LeftArcPanel.vue。
 *
 * ────────────────────────────────────────────────────────────
 * 【如何调整右侧弧度】
 *
 *   通过 curvature prop 传入 0.0 ～ 1.0 的数值：
 *     · 1.0（默认）：最深弧形（约 240° 椭圆弧）
 *     · 0.5        ：中等弧形
 *     · 0.0        ：完全平直
 *
 *   示例：
 *     <RightArcPanel :curvature="0.7" :hours="rightHours" @markClick="goTo" />
 *
 *   ✅ curvature 只影响弧线的水平深度，
 *      时间刻度的垂直位置始终均匀分布，弧形两端不变形。
 *
 * 【左右弧度独立调节】
 *   左弧和右弧分别是独立组件，可以设置不同的 curvature：
 *     <LeftArcPanel  :curvature="0.8" ... />
 *     <RightArcPanel :curvature="0.6" ... />
 * ────────────────────────────────────────────────────────────
 */

import { ref, computed, getCurrentInstance } from 'vue'
import { useArcPanel } from '../composables/useArcPanel.js'

const props = defineProps({
  /** 需要显示的小时数组（有序），每个元素对应一条刻度 */
  hours:       { type: Array,   required: true },
  /** 需要高亮显示的小时列表（用于 Page2 等场景标记当前时间窗口） */
  activeHours: { type: Array,   default: () => [] },
  /** 是否渲染弧线和刻度连线（静态背景层使用 false 可只显示弧线不显示点） */
  showArc:     { type: Boolean, default: true  },
  /** 是否渲染刻度点、光环和时间标签 */
  showDots:    { type: Boolean, default: true  },
  /**
   * 弧度系数（0.0 ～ 1.0）
   *   - 1.0：最深弧形（默认值，约 240° 椭圆弧）
   *   - 0.5：中等弧形
   *   - 0.0：完全平直（弧线退化为垂直直线）
   *
   * 修改此值后，弧线深度随之改变，但各刻度的垂直位置不变。
   */
  curvature:   { type: Number,  default: 1.0   },
})

const emit = defineEmits(['markClick'])

// 绑定到根 div，供 ResizeObserver 测量面板尺寸
const wrapEl = ref(null)

const hoursRef     = computed(() => props.hours)
// 将 curvature prop 转为响应式 ref，传入 composable 参与弧度计算
const curvatureRef = computed(() => props.curvature)

// 使用 composable 计算刻度位置和弧形路径（固定 side = 'right'）
const { panelW, panelH, marks, arcPath } = useArcPanel(hoursRef, 'right', wrapEl, curvatureRef)

function fmtHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

// 为每个组件实例生成唯一的 SVG filter ID，避免多实例时 ID 冲突
const uid = getCurrentInstance()?.uid ?? 0
const filterId = `glow-right-${uid}`

/**
 * 向父组件暴露 marks（刻度位置数组）和 panelW（面板宽度）。
 * 父组件可通过 ref 读取这些值来计算列表行的内边距（arc 贴合缩进）：
 *   paddingLeft = mark.cx   （右侧列表行的左缩进）
 */
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
        <!-- 普通辉光滤镜（用于弧线和非激活刻度点） -->
        <filter :id="filterId" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- 强辉光滤镜（用于激活状态的刻度光环） -->
        <filter :id="`${filterId}-active`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- 静态层：弧线 + 向右侧列表延伸的刻度连线 -->
      <template v-if="showArc">
        <path :d="arcPath" class="arc-line" :filter="`url(#${filterId})`" />
        <!-- 刻度连线从弧点向右延伸到面板右边缘（与右侧列表贴合） -->
        <line
          v-for="m in marks" :key="`tick-${m.hour}`"
          :x1="m.cx"    :y1="m.cy"
          :x2="panelW"  :y2="m.cy"
          class="tick-line"
        />
      </template>

      <!-- 动画层：激活光环 + 可点击刻度圆点 -->
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

    <!-- 动画层：时间标签，显示在弧点左侧（弧线凹入侧） -->
    <template v-if="showDots">
      <div
        v-for="m in marks"
        :key="`lbl-${m.hour}`"
        class="mark-label"
        :class="{ 'mark-label--active': activeHours.includes(m.hour) }"
        :style="{ top: m.cy + 'px', right: (panelW - m.cx + 10) + 'px' }"
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
.mark-dot--active { fill: #60ffcc; }

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
