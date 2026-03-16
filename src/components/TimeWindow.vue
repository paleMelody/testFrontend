<script setup>
defineProps({
  config: {
    type: Object,
    required: true,
    // config: { id, title, content, bg, borderColor, textColor }
  },
})
</script>

<template>
  <div
    class="time-window"
    :style="{
      background: config.bg,
      borderColor: config.borderColor,
      color: config.textColor || '#c0d4f5',
    }"
  >
    <div class="tw-title">{{ config.title }}</div>
    <div class="tw-content">{{ config.content }}</div>
  </div>
</template>

<style scoped>
.time-window {
  flex-shrink: 0;
  width: 120px;
  height: calc(100% - 8px);
  margin: 4px 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: default;
  transition: filter 0.2s;
}
.time-window:hover {
  filter: brightness(1.3);
}
.tw-title {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
}
.tw-content {
  font-size: 10px;
  opacity: 0.65;
  white-space: nowrap;
}
</style>
