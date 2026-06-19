import { useSuspenseQuery } from "@tanstack/react-query"
// @ts-expect-error
import L from "leaflet"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  MapContainer as MapContainerBase,
  Marker as MarkerBase,
  Popup as PopupBase,
  TileLayer as TileLayerBase,
  useMap,
  useMapEvent,
} from "react-leaflet"

// react-leaflet @types are out of sync with the installed version — cast to any
const MapContainer = MapContainerBase as any
const Marker = MarkerBase as any
const Popup = PopupBase as any
const TileLayer = TileLayerBase as any

import type Supercluster from "supercluster"
import supercluster from "supercluster"
import type { ContactGeoPoint } from "@/client/custom"
import { contactsGeoQueryOptions } from "@/lib/queries"
import "leaflet/dist/leaflet.css"
import { MapIcon } from "lucide-react"
import { ContactMapCard } from "@/components/Contacts/ContactMapCard"

delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface MapBounds {
  minLat?: number
  maxLat?: number
  minLng?: number
  maxLng?: number
}

interface ContactsMapProps {
  bounds?: MapBounds
}

interface ClusterMarkerProps {
  cluster: Supercluster.ClusterFeature<Supercluster.AnyProps>
  map: L.Map
  points: ContactGeoPoint[]
}

interface ContactMarkerProps {
  point: ContactGeoPoint
}

// Custom cluster icon
function createClusterIcon(count: number): L.DivIcon {
  const size = Math.min(40 + count * 2, 60)
  return L.divIcon({
    html: `<div class="flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg" style="width: ${size}px; height: ${size}px;">${count}</div>`,
    className: "border-0 bg-transparent",
    iconSize: [size, size],
  })
}

// Component to handle cluster click - zooms to cluster bounds
function ClusterMarker({ cluster, map }: ClusterMarkerProps) {
  const [_isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    const [_west, _south, _east, _north] = cluster.properties.cluster
      ? (cluster as any).geometry.coordinates
      : [0, 0, 0, 0]
    // For actual clusters, we need to get the bounding box from cluster properties
    const clusterId = (cluster as any).id
    if (clusterId) {
      // Zoom in one level on cluster click
      const currentZoom = map.getZoom()
      map.setZoom(currentZoom + 2)
      map.panTo([
        cluster.geometry.coordinates[1],
        cluster.geometry.coordinates[0],
      ])
    }
  }

  return (
    <Marker
      position={[
        cluster.geometry.coordinates[1],
        cluster.geometry.coordinates[0],
      ]}
      icon={createClusterIcon(cluster.properties.point_count)}
      eventHandlers={{
        click: handleClick,
        mouseover: () => setIsHovered(true),
        mouseout: () => setIsHovered(false),
      }}
    >
      <Popup>
        <div className="text-sm text-center">
          <div className="font-semibold">
            {cluster.properties.point_count} contacts
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            Click to zoom in
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

// Component for individual contact marker with popup card
function ContactMarker({ point }: ContactMarkerProps) {
  return (
    <Marker
      position={[point.latitude, point.longitude]}
      icon={L.icon({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      })}
    >
      <Popup maxWidth={320} minWidth={280}>
        <ContactMapCard point={point} />
      </Popup>
    </Marker>
  )
}

// Component to update map view when center/zoom changes
function ChangeView({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

// Component to track map bounds for filtering
function MapBoundsTracker({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: MapBounds) => void
}) {
  const map = useMapEvent("moveend", () => {
    const bounds = map.getBounds()
    onBoundsChange({
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    })
  })
  return null
}

export function ContactsMap({ bounds: initialBounds }: ContactsMapProps) {
  const [bounds, setBounds] = useState<MapBounds>(initialBounds || {})
  const mapRef = useRef<L.Map | null>(null)

  const { data } = useSuspenseQuery(contactsGeoQueryOptions(bounds))

  const points: ContactGeoPoint[] = data.points || []

  // Create supercluster index
  const clusterIndex = useMemo(() => {
    if (points.length === 0) return null

    const index = new supercluster({
      radius: 60,
      maxZoom: 16,
    })

    const geojsonPoints = points.map((p) => ({
      type: "Feature" as const,
      properties: {
        contact_id: p.contact_id,
        contact_name: p.contact_name,
        avatar_url: p.avatar_url,
        address_label: p.address_label,
        city: p.city,
        country: p.country,
        street: p.street,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude] as [number, number],
      },
    }))

    index.load(geojsonPoints)
    return index
  }, [points])

  // Get clusters for current map view
  const clusters = useMemo(() => {
    if (!clusterIndex || !mapRef.current) return []

    const map = mapRef.current
    const zoom = map.getZoom()
    const bounds = map.getBounds()
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    return clusterIndex.getClusters(bbox, Math.round(zoom))
  }, [clusterIndex])

  // Default center (US center) if no points
  const defaultCenter: [number, number] = [39.8283, -98.5795]
  const defaultZoom = 4

  // Calculate center from points if available
  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
          points.reduce((sum, p) => sum + p.longitude, 0) / points.length,
        ]
      : defaultCenter

  const zoom = points.length > 0 ? 10 : defaultZoom

  const handleBoundsChange = (newBounds: MapBounds) => {
    setBounds(newBounds)
  }

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border relative">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        ref={(map: any) => {
          if (map) mapRef.current = map
        }}
      >
        <ChangeView center={center} zoom={zoom} />
        <MapBoundsTracker onBoundsChange={handleBoundsChange} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {clusters.map((cluster) => {
          // Check if this is a cluster or a point
          const isCluster = (cluster as any).properties?.cluster
          if (isCluster) {
            return (
              <ClusterMarker
                key={(cluster as any).id}
                cluster={cluster as any}
                map={mapRef.current!}
                points={points}
              />
            )
          }
          // It's a point - find the corresponding ContactGeoPoint
          const coords = (cluster as any).geometry.coordinates
          const props = (cluster as any).properties
          const point = points.find(
            (p) =>
              p.longitude === coords[0] &&
              p.latitude === coords[1] &&
              p.contact_id === props.contact_id,
          )
          if (!point) return null
          return <ContactMarker key={point.contact_id} point={point} />
        })}
      </MapContainer>
      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
          <div className="text-center">
            <MapIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
              No contacts with locations
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add addresses with coordinates to see contacts on the map.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
