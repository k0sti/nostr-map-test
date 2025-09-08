<template>
  <div class="map-container">
    <div id="map" ref="mapContainer"></div>
    
    <!-- Layer Control Panel -->
    <div class="layer-control">
      <h3>Event Layers</h3>
      <div v-for="layer in layers" :key="layer.id" class="layer-item">
        <label>
          <input 
            type="checkbox" 
            v-model="layer.visible"
            @change="toggleLayer(layer)"
          />
          <span class="layer-name">{{ layer.name }}</span>
          <span class="layer-count">({{ layer.count }})</span>
        </label>
        <div class="layer-color" :style="{ backgroundColor: layer.color }"></div>
      </div>
    </div>

    <!-- Event Details Popup -->
    <div v-if="selectedEvent" class="event-details">
      <button class="close-btn" @click="selectedEvent = null">×</button>
      <h3>{{ selectedEvent.title }}</h3>
      <p class="event-type">{{ selectedEvent.eventType }}</p>
      <p v-if="selectedEvent.summary" class="event-summary">{{ selectedEvent.summary }}</p>
      <p v-if="selectedEvent.location" class="event-location">📍 {{ selectedEvent.location }}</p>
      <div v-if="selectedEvent.price" class="event-price">
        💰 {{ selectedEvent.price.amount }} {{ selectedEvent.price.currency }}
        <span v-if="selectedEvent.price.frequency"> / {{ selectedEvent.price.frequency }}</span>
      </div>
      <img v-if="selectedEvent.image" :src="selectedEvent.image" class="event-image" />
      <p class="event-time">{{ formatTime(selectedEvent.created_at) }}</p>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="loading">
      Loading Nostr events...
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import { NostrClient } from '../utils/nostrClient'

export default {
  name: 'MapView',
  setup() {
    const mapContainer = ref(null)
    const loading = ref(true)
    const selectedEvent = ref(null)
    const nostrClient = ref(null)
    const map = ref(null)
    const markerGroups = ref({})
    
    const layers = ref([
      { id: 'notes', name: 'Notes', visible: true, color: '#3B82F6', count: 0, kinds: [1] },
      { id: 'calendar', name: 'Calendar Events', visible: true, color: '#10B981', count: 0, kinds: [31922, 31923] },
      { id: 'classified', name: 'Classified Listings', visible: true, color: '#F59E0B', count: 0, kinds: [30402] },
      { id: 'live', name: 'Live Activities', visible: true, color: '#EF4444', count: 0, kinds: [30311, 30312, 30313] },
      { id: 'marketplace', name: 'Marketplace', visible: true, color: '#8B5CF6', count: 0, kinds: [30017, 30018] }
    ])

    const eventsByLayer = ref({
      notes: [],
      calendar: [],
      classified: [],
      live: [],
      marketplace: []
    })

    const initMap = () => {
      map.value = L.map(mapContainer.value).setView([40.7128, -74.0060], 3)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map.value)

      // Initialize layer groups
      layers.value.forEach(layer => {
        markerGroups.value[layer.id] = L.layerGroup().addTo(map.value)
      })
    }

    const getLayerForKind = (kind) => {
      for (const layer of layers.value) {
        if (layer.kinds.includes(kind)) {
          return layer
        }
      }
      return layers.value[0] // Default to notes
    }

    const createMarkerIcon = (color) => {
      return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }

    const addEventToMap = (event) => {
      if (!event.coordinates) return
      
      const layer = getLayerForKind(event.kind)
      const layerId = layer.id
      
      // Store event in layer data
      if (!eventsByLayer.value[layerId]) {
        eventsByLayer.value[layerId] = []
      }
      eventsByLayer.value[layerId].push(event)
      
      // Update count
      layer.count = eventsByLayer.value[layerId].length
      
      // Create marker
      const marker = L.marker(
        [event.coordinates.lat, event.coordinates.lng],
        { icon: createMarkerIcon(layer.color) }
      )
      
      marker.on('click', () => {
        selectedEvent.value = event
      })
      
      // Add popup
      const popupContent = `
        <div style="min-width: 200px;">
          <strong>${event.title}</strong><br/>
          <em>${event.eventType}</em><br/>
          ${event.location ? `📍 ${event.location}` : ''}
        </div>
      `
      marker.bindPopup(popupContent)
      
      // Add to layer group
      if (layer.visible) {
        marker.addTo(markerGroups.value[layerId])
      }
    }

    const toggleLayer = (layer) => {
      const group = markerGroups.value[layer.id]
      if (layer.visible) {
        map.value.addLayer(group)
      } else {
        map.value.removeLayer(group)
      }
    }

    const loadEvents = async () => {
      loading.value = true
      nostrClient.value = new NostrClient()
      
      try {
        const events = await nostrClient.value.fetchLocationEvents()
        
        events.forEach(event => {
          addEventToMap(event)
        })
        
        // Subscribe to new events
        nostrClient.value.subscribeToLocationEvents((event) => {
          addEventToMap(event)
        })
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        loading.value = false
      }
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp * 1000).toLocaleString()
    }

    onMounted(() => {
      initMap()
      loadEvents()
    })

    onUnmounted(() => {
      if (nostrClient.value) {
        nostrClient.value.disconnect()
      }
      if (map.value) {
        map.value.remove()
      }
    })

    return {
      mapContainer,
      loading,
      selectedEvent,
      layers,
      toggleLayer,
      formatTime
    }
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100vw;
  height: 100vh;
}

#map {
  width: 100%;
  height: 100%;
}

.layer-control {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 250px;
}

.layer-control h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.layer-item label {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex: 1;
}

.layer-item input[type="checkbox"] {
  margin-right: 8px;
}

.layer-name {
  font-size: 14px;
}

.layer-count {
  font-size: 12px;
  color: #666;
  margin-left: 5px;
}

.layer-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-left: 10px;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.event-details {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  max-width: 400px;
  max-height: 500px;
  overflow-y: auto;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #000;
}

.event-details h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  padding-right: 30px;
}

.event-type {
  color: #666;
  font-size: 14px;
  margin: 5px 0;
  font-style: italic;
}

.event-summary {
  margin: 10px 0;
  line-height: 1.5;
}

.event-location {
  margin: 10px 0;
  color: #333;
}

.event-price {
  margin: 10px 0;
  font-weight: 600;
  color: #10B981;
}

.event-image {
  width: 100%;
  margin: 10px 0;
  border-radius: 4px;
}

.event-time {
  font-size: 12px;
  color: #999;
  margin-top: 10px;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  font-size: 16px;
}
</style>