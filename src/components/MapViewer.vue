<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import type { EventsKey } from 'ol/events'
import { unByKey } from 'ol/Observable'
import { fromLonLat, toLonLat } from 'ol/proj'
import Overlay from 'ol/Overlay'
import { useMapStore } from '@/stores/map'

const mapTarget = ref<HTMLElement | null>(null)
const mapStore = useMapStore()
const { center, zoom, basemaps, mapillaryOverlays, mapillaryPosition, mapillaryBearing, mapillaryFov } = storeToRefs(mapStore)

const cameraEl = ref<HTMLElement | null>(null)

const makeArcPath = (fov: number) => {
  const radius = 45
  const cx = 50
  const cy = 50
  const fovRad = (Math.PI / 180) * fov
  const arcStart = -Math.PI / 2 - fovRad / 2
  const arcEnd = arcStart + fovRad
  const sx = cx + radius * Math.cos(arcStart)
  const sy = cy + radius * Math.sin(arcStart)
  const ex = cx + radius * Math.cos(arcEnd)
  const ey = cy + radius * Math.sin(arcEnd)
  return `M ${cx} ${cy} L ${sx} ${sy} A ${radius} ${radius} 0 0 1 ${ex} ${ey} Z`
}

let currentRotation = 0

const updateArc = () => {
  if (!cameraEl.value) return
  const path = cameraEl.value.querySelector('path')
  const svg = cameraEl.value.querySelector('svg')
  if (path) path.setAttribute('d', makeArcPath(mapillaryFov.value))
  if (svg) {
    let delta = mapillaryBearing.value - (((currentRotation % 360) + 360) % 360)
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    currentRotation += delta
    ;(svg as unknown as HTMLElement).style.transform = `rotateZ(${currentRotation}deg)`
  }
}
let map: Map | null = null
let positionOverlay: Overlay | null = null
let moveEndListener: EventsKey | null = null

const areNumbersClose = (left: number, right: number, tolerance = 0.000001) =>
  Math.abs(left - right) <= tolerance

const areLonLatClose = (
  currentCenter: [number, number],
  nextCenter: [number, number],
  tolerance = 0.000001,
) =>
  areNumbersClose(currentCenter[0], nextCenter[0], tolerance) &&
  areNumbersClose(currentCenter[1], nextCenter[1], tolerance)

const onMapClick = (evt: any) => {
  if (!map) return

  let clickedFeature: any = null
  map.forEachFeatureAtPixel(evt.pixel, (feature) => {
    if (!clickedFeature && feature.getGeometry()?.getType() === 'Point') {
      clickedFeature = feature
    }
  })

  if (!clickedFeature) return

  const imageId = clickedFeature.get('id') || clickedFeature.getId()
  if (!imageId) return

  mapStore.mapillaryLoading = true
  mapStore.setMapillaryImageId(String(imageId))
  // map.getView().animate({ center: evt.coordinate, zoom: 17, duration: 600 })
}

const syncStoreFromMap = () => {
  if (!map) {
    return
  }

  const view = map.getView()
  const currentCenter = view.getCenter()
  const currentZoom = view.getZoom()

  if (!currentCenter || currentZoom === undefined) {
    return
  }

  const nextCenter = toLonLat(currentCenter) as [number, number]
  mapStore.syncViewState(nextCenter, currentZoom)
}

onMounted(() => {
  if (!mapTarget.value) {
    return
  }

  map = new Map({
    target: mapTarget.value,
    layers: basemaps.value.map((b) => b.layer) as unknown as import('ol/layer/Tile').default[],
    view: new View({
      center: fromLonLat(center.value),
      zoom: zoom.value,
    })
  })

  // Change Zoom button postion
  let zoomElement = (map.getControls().getArray()[0] as any)?.element;
  zoomElement?.classList.add('ol-zoom-custom');
  zoomElement?.classList.remove('ol-zoom');
  mapillaryOverlays.value.forEach((o) => map!.addLayer(o.layer as any))

  positionOverlay = new Overlay({
    element: cameraEl.value!,
    positioning: 'center-center',
    stopEvent: false,
  })
  map.addOverlay(positionOverlay)

  mapStore.setMap(map)
  moveEndListener = map.on('moveend', syncStoreFromMap)
  map.on('singleclick', onMapClick)
  syncStoreFromMap()
})

onUnmounted(() => {
  if (moveEndListener) {
    unByKey(moveEndListener)
    moveEndListener = null
  }

  if (!map) {
    return
  }

  map.setTarget(undefined)
  mapStore.setMap(null)
  map = null
})

watch(
  () => [center.value[0], center.value[1], zoom.value] as const,
  ([lon, lat, nextZoom]) => {
    if (!map) {
      return
    }

    const view = map.getView()
    const currentCenter = view.getCenter()
    const currentZoom = view.getZoom()
    const nextCenter: [number, number] = [lon, lat]

    if (currentCenter) {
      const currentLonLat = toLonLat(currentCenter) as [number, number]

      if (!areLonLatClose(currentLonLat, nextCenter)) {
        view.setCenter(fromLonLat(nextCenter))
      }
    } else {
      view.setCenter(fromLonLat(nextCenter))
    }

    if (currentZoom === undefined || !areNumbersClose(currentZoom, nextZoom)) {
      view.setZoom(nextZoom)
    }
  },
)

watch(mapillaryPosition, (pos) => {
  if (!positionOverlay) return
  if (!pos) {
    positionOverlay.setPosition(undefined)
    return
  }
  positionOverlay.setPosition(fromLonLat(pos))
})

watch(mapillaryBearing, () => updateArc())
watch(mapillaryFov, () => updateArc())
</script>

<template>
  <div ref="mapTarget" class="map-viewer"></div>
  <div ref="cameraEl" class="camera-marker">
    <svg viewBox="0 0 100 100">
      <path :d="makeArcPath(90)" fill="rgba(255, 69, 0, 0.45)" stroke="#ff4500" stroke-width="2" stroke-linejoin="round" />
    </svg>
    <div class="camera-dot"></div>
  </div>
</template>

<style scoped>
.map-viewer {
  width: 100%;
  height: 100%;
}

.camera-marker {
  position: relative;
  width: 120px;
  height: 120px;
  pointer-events: none;
}
.camera-marker svg {
  width: 100%;
  height: 100%;
  transition: transform 0.15s ease;
}
.camera-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  background: #38bdf8;
  border: 2px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.6);
}
</style>
