import { useEffect, useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CustomContactsService } from "@/client/custom";
import { ContactGeoPoint } from "@/client/custom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// @ts-ignore: No type declarations for leaflet
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapBounds {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

interface ContactsMapProps {
  bounds?: MapBounds;
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function ContactsMap({ bounds }: ContactsMapProps) {
  const { data } = useSuspenseQuery({
    queryKey: ["contactsGeo", bounds],
    queryFn: () =>
      CustomContactsService.listContactsGeo({
        minLat: bounds?.minLat,
        maxLat: bounds?.maxLat,
        minLng: bounds?.minLng,
        maxLng: bounds?.maxLng,
      }),
  });

  const points: ContactGeoPoint[] = data.points || [];
  const mapRef = useRef<any>(null);

  // Default center (US center) if no points
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const defaultZoom = 4;

  // Calculate center from points if available
  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
          points.reduce((sum, p) => sum + p.longitude, 0) / points.length,
        ]
      : defaultCenter;

  const zoom = points.length > 0 ? 10 : defaultZoom;

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
      >
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <Marker
            key={point.contact_id}
            position={[point.latitude, point.longitude]}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{point.contact_name}</div>
                {point.address_label && (
                  <div className="text-muted-foreground">
                    {point.address_label}
                  </div>
                )}
                {point.city && (
                  <div className="text-muted-foreground">
                    {point.city}
                    {point.country ? `, ${point.country}` : ""}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
