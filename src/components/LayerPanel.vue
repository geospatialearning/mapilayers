<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  QDrawer,
  QTabs,
  QTab,
  QTabPanels,
  QTabPanel,
  QBtn,
  QIcon
} from 'quasar'
import { useMapStore } from '@/stores/map'


// ── Store ───────────────────────────────────────────────────────────

const mapStore = useMapStore()
const { map, isReady, basemaps, rasterLayers } = storeToRefs(mapStore)

const open = defineModel<boolean>('modelValue', { default: true })
const activeTab = ref('layers')

// ── Layers tab: raster browsing ─────────────────────────────────────

const showBrowser = ref(false)
const files = ref<RasterFile[]>([])
const fetching = ref(false)
const loadingFile = ref<string | null>(null)
const error = ref<string | null>(null)

const toggleBrowser = async () => {
  showBrowser.value = !showBrowser.value
  if (showBrowser.value && files.value.length === 0) {
    await fetchFiles()
  }
}

const fetchFiles = async () => {
  fetching.value = true
  error.value = null

  try {
    const res = await fetch(`${API_BASE}/browse/`)
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.detail || 'Failed to fetch datasets')
    }
    const data = await res.json()
    files.value = data.files
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch datasets'
  } finally {
    fetching.value = false
  }
}

// ── Layers tab: layer management ────────────────────────────────────

const toggleVisibility = (name: string) => {
  mapStore.toggleRasterLayer(name)
}
</script>

<template>
  <QDrawer v-model="open" side="left" :width="320" :breakpoint="0" class="layer-drawer">
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-brand">
        <QIcon name="satellite_alt" size="22px" />
        <span class="header-title">GeoAnnotate</span>
      </div>
      <QBtn
        flat
        dense
        round
        icon="chevron_left"
        size="sm"
        class="header-close"
        @click="open = false"
      />
    </div>

    <!-- Tabs -->
    <QTabs
      v-model="activeTab"
      dense
      active-color="white"
      indicator-color="white"
      align="justify"
      narrow-indicator
      class="panel-tabs"
    >
      <QTab name="layers" icon="layers" label="Layers" no-caps />
    </QTabs>

    <QTabPanels v-model="activeTab" animated class="tab-panels">
      <!-- ── Layers Tab ──────────────────────────────────────────── -->
      <QTabPanel name="layers" class="q-pa-none panel-content">
        <!-- Basemaps -->
        <div class="section-header basemap-header">
          <QIcon name="public" size="16px" class="section-icon" />
          <span>Basemaps</span>
        </div>

        <div class="basemap-list">
          <div
            v-for="bm in basemaps"
            :key="bm.name"
            class="basemap-card"
            :class="{ 'basemap-active': bm.visible }"
            @click="mapStore.toggleBasemap(bm.name)"
          >
            <QIcon
              :name="bm.name === 'OpenStreetMap' ? 'map' : 'satellite'"
              size="18px"
              :class="bm.visible ? 'basemap-icon-on' : 'basemap-icon-off'"
            />
            <span class="basemap-name">{{ bm.name }}</span>
            <div class="basemap-indicator" :class="{ active: bm.visible }"></div>
          </div>
        </div>
      </QTabPanel>
    </QTabPanels>
  </QDrawer>
</template>

<style scoped>


/* ── Header ────────────────────────────────────────────────────── */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #0c1324;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #38bdf8;
}
.header-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.header-close {
  color: #64748b;
}
.header-close:hover {
  color: #e2e8f0;
}

/* ── Tabs ──────────────────────────────────────────────────────── */
.panel-tabs {
  background: #1e293b;
}
.panel-tabs :deep(.q-tab__label) {
  font-size: 12px;
  font-weight: 500;
}
.panel-tabs :deep(.q-tab__icon) {
  font-size: 18px;
}
.panel-tabs :deep(.q-tab) {
  color: #64748b;
}
.panel-tabs :deep(.q-tab--active) {
  color: #e2e8f0;
}

/* ── Tab panels ────────────────────────────────────────────────── */
.tab-panels {
  flex: 1;
  overflow-y: auto;
  background: transparent;
}
.tab-panels :deep(.q-tab-panel) {
  background: transparent;
}
.panel-content {
  padding: 0;
}

/* ── Section headers ───────────────────────────────────────────── */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #64748b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.section-icon {
  color: #475569;
}
.section-actions {
  margin-left: auto;
}
.section-btn {
  color: #64748b;
}
.section-btn:hover {
  color: #38bdf8;
}


/* ── File cards ────────────────────────────────────────────────── */
.file-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  overflow: hidden;
}
.file-card:hover {
  background: rgba(255, 255, 255, 0.06);
}
.file-card.file-loaded {
  cursor: default;
  opacity: 0.6;
}
.file-card.file-loading {
  background: rgba(56, 189, 248, 0.06);
}
.file-icon {
  color: #475569;
  flex-shrink: 0;
}
.icon-loaded {
  color: #2dd4bf;
}
.file-info {
  flex: 1;
  min-width: 0;
}
.file-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-size {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}
.file-status {
  flex-shrink: 0;
}
.loaded-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
}
.file-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
}

/* ── Layer list ────────────────────────────────────────────────── */
.layer-list {
  padding: 8px;
}
.layer-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.layer-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.vis-btn-on {
  color: #38bdf8;
}
.vis-btn-off {
  color: #475569;
}
.layer-info {
  flex: 1;
  min-width: 0;
}
.layer-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.layer-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}
.remove-btn {
  color: #475569;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.layer-card:hover .remove-btn {
  opacity: 1;
}
.remove-btn:hover {
  color: #f87171;
}

/* ── Empty state ───────────────────────────────────────────────── */
.empty-layers {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 14px;
  color: #475569;
  font-size: 13px;
}
.empty-hint {
  font-size: 11px;
  color: #334155;
}

/* ── Basemaps ──────────────────────────────────────────────────── */
.basemap-header {
  margin-top: 4px;
}
.basemap-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.basemap-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.basemap-card:hover {
  background: rgba(255, 255, 255, 0.06);
}
.basemap-card.basemap-active {
  background: rgba(56, 189, 248, 0.08);
}
.basemap-icon-on {
  color: #38bdf8;
}
.basemap-icon-off {
  color: #475569;
}
.basemap-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}
.basemap-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #334155;
  transition: background 0.2s ease;
}
.basemap-indicator.active {
  background: #38bdf8;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
}

/* ── Transitions ───────────────────────────────────────────────── */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
  max-height: 400px;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
