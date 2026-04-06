<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Viewer } from 'mapillary-js'
import 'mapillary-js/dist/mapillary.css'
import { storeToRefs } from 'pinia'
import { useMapStore } from '@/stores/map'

const containerRef = ref<HTMLElement | null>(null)
const mapStore = useMapStore()
const { mapillaryImageId, mapillaryLoading } = storeToRefs(mapStore)

const panelRef = ref<HTMLElement | null>(null)
let viewer: Viewer | null = null

const ensureViewer = () => {
  if (viewer || !containerRef.value) return
  viewer = new Viewer({
    accessToken: import.meta.env.VITE_MAPILLARY_TOKEN,
    container: containerRef.value,
    component: {
      cover: false,
      spatial: false,
    },
  })

  viewer.on('position', async () => {
    if (!viewer) return
    const pos = await viewer.getPosition()
    mapStore.setMapillaryPosition([pos.lng, pos.lat])
  })

  viewer.on('pov', async () => {
    if (!viewer) return
    const pov = await viewer.getPointOfView()
    mapStore.setMapillaryBearing(pov.bearing)
  })

  viewer.on('load', () => {
    mapillaryLoading.value = false
  })

  viewer.on('fov', async () => {
    if (!viewer) return
    const container = viewer.getContainer()
    const height = container.offsetHeight
    const width = container.offsetWidth
    const aspect = height === 0 ? 0 : width / height
    const verticalFov = (Math.PI / 180) * (await viewer.getFieldOfView())
    const horizontalFov = (180 / Math.PI) * Math.atan(aspect * Math.tan(0.5 * verticalFov)) * 2
    mapStore.setMapillaryFov(horizontalFov)
  })
}



onUnmounted(() => {
  viewer?.remove()
  viewer = null
})

watch(mapillaryImageId, async (imageId) => {
  if (!imageId) return

  await nextTick()
  ensureViewer()
  if (!viewer) return

  try {
    viewer.resize()
    await viewer.moveTo(imageId)
  } catch {
    mapStore.setMapillaryImageId(null)
  }
})
</script>

<template>
  <div
    ref="panelRef"
    class="mapillary-panel"
    v-show="mapillaryImageId"
  >
    <div class="mapillary-header">
      <span>Street View</span>
      <button class="close-btn" @click="mapStore.setMapillaryImageId(null)">&times;</button>
    </div>
    <div ref="containerRef" class="mapillary-container">
      <div v-if="mapillaryLoading" class="loading-overlay">
        <div class="spinner"></div>
        <span>Loading street view...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mapillary-panel {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 480px;
  height: 320px;
  z-index: 1000;
  border-radius: 8px;
  overflow: hidden;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.mapillary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.close-btn:hover {
  color: #f87171;
}

.mapillary-container {
  flex: 1;
  position: relative;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.85);
  color: #94a3b8;
  font-size: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
