<template>
  <div id="app">
    <header class="app-header">
      <h1>Nostr Map Explorer</h1>
      <p class="subtitle">Discover location-based Nostr events worldwide</p>
    </header>
    <MapView />
  </div>
</template>

<script>
import MapView from './components/MapView.vue'

export default {
  name: 'App',
  components: {
    MapView
  }
}
</script>

<style>
#app {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  position: absolute;
  top: 20px;
  left: 20px;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
}

.app-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
}

.subtitle {
  margin: 5px 0 0 0;
  font-size: 14px;
  color: #6B7280;
}
</style>