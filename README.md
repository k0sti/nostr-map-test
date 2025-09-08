# Nostr Map Explorer

A web application that displays Nostr events with location information on an interactive map.

## Features

- **Interactive Map Interface**: Built with Leaflet for smooth map interactions
- **Multiple Event Types**: Supports various Nostr event kinds with location data:
  - Regular notes with geohash tags
  - Calendar events (NIP-52)
  - Classified listings (NIP-99)
  - Live activities/streaming (NIP-53)
  - Marketplace listings (NIP-15)
- **Layer Control**: Toggle visibility of different event types
- **Real-time Updates**: Subscribes to new location-based events
- **Event Details**: Click markers to view detailed event information

## Location Detection

The app detects location information from:
- `g` tag (geohash)
- `location` tag (address/coordinates)
- Coordinate parsing from location strings

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Technologies

- Vue 3 - Progressive JavaScript framework
- Vite - Fast build tool
- Leaflet - Open-source map library
- nostr-tools - Nostr protocol implementation
- WebSocket - Real-time event streaming

## Supported Event Types

| Event Kind | Description | NIP |
|------------|-------------|-----|
| 1 | Regular notes with geohash | - |
| 30402 | Classified listings | NIP-99 |
| 31922/31923 | Calendar events | NIP-52 |
| 30311/30312/30313 | Live activities | NIP-53 |
| 30017/30018 | Marketplace | NIP-15 |

## Default Relays

The app connects to multiple public Nostr relays to fetch events:
- wss://relay.damus.io
- wss://relay.nostr.band
- wss://nos.lol
- wss://relay.nostr.bg
- wss://nostr.wine
- wss://relay.snort.social
- wss://relay.current.fyi
- wss://nostr.mom