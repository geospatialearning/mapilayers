<script setup lang="ts">
import { ref } from 'vue'
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

const mapStore = useMapStore()
const { basemaps } = storeToRefs(mapStore)

const open = defineModel<boolean>('modelValue', { default: true })
const activeTab = ref('layers')
</script>

<template>
  <QDrawer v-model="open" side="left" :width="320" :breakpoint="0" class="layer-drawer">
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-brand">
        <QIcon name="travel_explore" size="22px" />
        <span class="header-title">MapiLayers</span>
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
</style>
