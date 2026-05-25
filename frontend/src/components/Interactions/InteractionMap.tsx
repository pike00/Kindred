// @ts-nocheck
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import type { InteractionPublic } from "@/client"
import "leaflet/dist/leaflet.css"

interface InteractionMapProps {
  interactions: InteractionPublic[]
}

// Default center (US continental center) - will adjust based on data
const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]
const DEFAULT_ZOOM = 4

export function InteractionMap({ interactions }: InteractionMapProps) {
  // Filter interactions that have lat/lon
  const mappedInteractions = interactions.filter(
    (ix) => ix.latitude != null && ix.longitude != null,
  )

  // Calculate center from interactions or use default
  const center: [number, number] =
    mappedInteractions.length > 0
      ? [
          mappedInteractions.reduce((sum, ix) => sum + (ix.latitude ?? 0), 0) /
            mappedInteractions.length,
          mappedInteractions.reduce((sum, ix) => sum + (ix.longitude ?? 0), 0) /
            mappedInteractions.length,
        ]
      : DEFAULT_CENTER

  const zoom = mappedInteractions.length > 0 ? 10 : DEFAULT_ZOOM

  if (mappedInteractions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No location data yet</p>
          <p className="text-sm text-muted-foreground">
            Log interactions with location info to see them on the map
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ height: "400px" }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappedInteractions.map((ix) => (
          <Marker key={ix.id} position={[ix.latitude!, ix.longitude!]}>
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-medium">{ix.channel.replace("_", " ")}</p>
                {ix.location_label && (
                  <p className="text-muted-foreground">{ix.location_label}</p>
                )}
                {ix.notes && (
                  <p className="text-muted-foreground max-w-xs truncate">
                    {ix.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(ix.occurred_at).toLocaleDateString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
