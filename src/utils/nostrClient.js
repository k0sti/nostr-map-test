import { SimplePool, nip19 } from 'nostr-tools'

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.nostr.bg',
  'wss://nostr.wine',
  'wss://relay.snort.social',
  'wss://relay.current.fyi',
  'wss://nostr.mom'
]

export class NostrClient {
  constructor() {
    this.pool = new SimplePool()
    this.relays = DEFAULT_RELAYS
    this.subscriptions = new Map()
  }

  async fetchLocationEvents(filters = {}) {
    const events = []
    
    // Base filter for events with location data
    const baseFilter = {
      ...filters,
      limit: 500
    }

    // Fetch different event types with location info
    const eventFilters = [
      // Calendar events (NIP-52)
      { ...baseFilter, kinds: [31922, 31923] }, // Date and time-based calendar events
      
      // Classified listings (NIP-99)
      { ...baseFilter, kinds: [30402] },
      
      // Live activities/streaming (NIP-53)
      { ...baseFilter, kinds: [30311, 30312, 30313] },
      
      // Marketplace (NIP-15)
      { ...baseFilter, kinds: [30017, 30018] }, // Stalls and products
      
      // Regular notes with geohash tags
      { ...baseFilter, kinds: [1], '#g': ['*'] }
    ]

    try {
      for (const filter of eventFilters) {
        const subEvents = await this.pool.querySync(this.relays, filter)
        events.push(...subEvents)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }

    return this.processLocationEvents(events)
  }

  processLocationEvents(events) {
    const locationEvents = []

    for (const event of events) {
      const locationData = this.extractLocationData(event)
      
      if (locationData) {
        locationEvents.push({
          id: event.id,
          pubkey: event.pubkey,
          created_at: event.created_at,
          kind: event.kind,
          content: event.content,
          ...locationData
        })
      }
    }

    return locationEvents
  }

  extractLocationData(event) {
    let location = null
    let coordinates = null
    let title = ''
    let summary = ''
    let image = ''
    let status = ''
    let price = null
    let eventType = this.getEventType(event.kind)

    // Extract common tags
    for (const tag of event.tags) {
      const [tagName, ...values] = tag

      switch (tagName) {
        case 'g': // geohash
          if (values[0]) {
            coordinates = this.decodeGeohash(values[0])
          }
          break
        case 'location':
          location = values[0]
          break
        case 'title':
          title = values[0]
          break
        case 'summary':
          summary = values[0]
          break
        case 'image':
          image = values[0]
          break
        case 'status':
          status = values[0]
          break
        case 'price':
          if (values.length >= 2) {
            price = {
              amount: parseFloat(values[0]),
              currency: values[1],
              frequency: values[2]
            }
          }
          break
      }
    }

    // Try to parse coordinates from location string if no geohash
    if (!coordinates && location) {
      coordinates = this.parseCoordinates(location)
    }

    // Return null if no location data found
    if (!coordinates && !location) {
      return null
    }

    return {
      location,
      coordinates,
      title: title || this.generateTitle(event),
      summary,
      image,
      status,
      price,
      eventType,
      tags: event.tags
    }
  }

  getEventType(kind) {
    const eventTypeMap = {
      1: 'Note',
      30402: 'Classified Listing',
      30403: 'Draft Listing',
      31922: 'Calendar Event (Date)',
      31923: 'Calendar Event (Time)',
      31924: 'Calendar',
      31925: 'Calendar RSVP',
      30311: 'Live Stream',
      30312: 'Meeting Space',
      30313: 'Meeting Room',
      30017: 'Marketplace Stall',
      30018: 'Marketplace Product'
    }
    
    return eventTypeMap[kind] || `Event (${kind})`
  }

  generateTitle(event) {
    // Generate a title based on event type if none provided
    const type = this.getEventType(event.kind)
    const preview = event.content.substring(0, 50)
    return preview || type
  }

  parseCoordinates(locationStr) {
    // Try to parse coordinates from various formats
    const patterns = [
      // Decimal degrees: 40.7128, -74.0060
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/,
      // With labels: lat: 40.7128, lon: -74.0060
      /lat:\s*(-?\d+\.?\d*),?\s*lon:\s*(-?\d+\.?\d*)/i,
      // GPS format
      /(-?\d+\.?\d*)[°\s]+([NS])\s*,?\s*(-?\d+\.?\d*)[°\s]+([EW])/i
    ]

    for (const pattern of patterns) {
      const match = locationStr.match(pattern)
      if (match) {
        if (pattern === patterns[0]) {
          return {
            lat: parseFloat(match[1]),
            lng: parseFloat(match[2])
          }
        }
        // Handle other formats...
      }
    }

    return null
  }

  decodeGeohash(geohash) {
    // Simplified geohash decoder
    const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'
    
    let isEven = true
    let lat = [-90.0, 90.0]
    let lon = [-180.0, 180.0]
    
    for (let i = 0; i < geohash.length; i++) {
      const cd = BASE32.indexOf(geohash[i])
      
      for (let j = 4; j >= 0; j--) {
        const mask = 1 << j
        if (isEven) {
          const mid = (lon[0] + lon[1]) / 2
          if (cd & mask) {
            lon[0] = mid
          } else {
            lon[1] = mid
          }
        } else {
          const mid = (lat[0] + lat[1]) / 2
          if (cd & mask) {
            lat[0] = mid
          } else {
            lat[1] = mid
          }
        }
        isEven = !isEven
      }
    }
    
    return {
      lat: (lat[0] + lat[1]) / 2,
      lng: (lon[0] + lon[1]) / 2
    }
  }

  subscribeToLocationEvents(callback) {
    const sub = this.pool.subscribeMany(
      this.relays,
      [
        { kinds: [31922, 31923], limit: 100 },
        { kinds: [30402], limit: 100 },
        { kinds: [30311, 30312, 30313], limit: 100 },
        { kinds: [1], '#g': [''], limit: 100 }
      ],
      {
        onevent: (event) => {
          const processed = this.processLocationEvents([event])
          if (processed.length > 0) {
            callback(processed[0])
          }
        }
      }
    )
    
    return sub
  }

  disconnect() {
    this.pool.close(this.relays)
  }
}