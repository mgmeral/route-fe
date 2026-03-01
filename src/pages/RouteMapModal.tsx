import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  geocodeSequential,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  type GeocodedStop,
  type LatLng,
} from '../utils/mapUtils';

/* ---------- fix default marker icons for bundled builds ---------- */
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/** Build a numbered circle icon for a stop marker. */
const numberedIcon = (n: number) =>
  L.divIcon({
    className: 'stop-number-icon',
    html: `<span>${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

/* ---------- transport type colors ---------- */

const TRANSPORT_COLORS: Record<string, string> = {
  FLIGHT: '#2563eb',   // blue
  BUS: '#16a34a',      // green
  SUBWAY: '#9333ea',   // purple
  METRO: '#9333ea',    // purple
  TRAIN: '#ea580c',    // orange
  UBER: '#f59e0b',     // amber
  TAXI: '#f59e0b',     // amber
  CAR: '#64748b',      // slate
  FERRY: '#0891b2',    // cyan
};

const DEFAULT_LEG_COLOR = '#6b7280'; // gray fallback

const getTransportColor = (transportLabel: string): string => {
  const upper = transportLabel.toUpperCase();
  for (const [key, color] of Object.entries(TRANSPORT_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return DEFAULT_LEG_COLOR;
};

/* ---------- transport type icons ---------- */

const TRANSPORT_ICONS: Record<string, string> = {
  FLIGHT: '✈️',
  BUS: '🚌',
  SUBWAY: '🚇',
  METRO: '🚇',
  TRAIN: '🚂',
  UBER: '🚗',
  TAXI: '🚕',
  CAR: '🚗',
  FERRY: '⛴️',
};

const getTransportIcon = (transportLabel: string): string => {
  const upper = transportLabel.toUpperCase();
  for (const [key, icon] of Object.entries(TRANSPORT_ICONS)) {
    if (upper.includes(key)) return icon;
  }
  return '🚏';
};

/** Build a DivIcon with the transport emoji for placement at a leg midpoint. */
const transportMidIcon = (transportLabel: string, color: string) =>
  L.divIcon({
    className: 'transport-mid-icon',
    html: `<span style="border-color:${color}">${getTransportIcon(transportLabel)}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

/** Compute the geographic midpoint between two LatLng points. */
const midpoint = (a: LatLng, b: LatLng): LatLng => ({
  lat: (a.lat + b.lat) / 2,
  lng: (a.lng + b.lng) / 2,
});

/* ---------- exported types ---------- */

/** A location stop on the route (derived from timeline data). */
export interface RouteStop {
  label: string;
  code?: string;
  city?: string;
  country?: string;
  /** The transport type that follows this stop (undefined for the last stop). */
  transportAfter?: string;
}

interface RouteMapModalProps {
  open: boolean;
  onClose: () => void;
  stops: RouteStop[];
}

/* ---------- internal state ---------- */

type GeoState =
  | { status: 'loading'; completed: number; total: number }
  | { status: 'ready'; geocoded: GeocodedStop[] }
  | { status: 'partial'; geocoded: GeocodedStop[]; failed: GeocodedStop[] }
  | { status: 'error'; message: string; stops: RouteStop[] };

/* ---------- helper: auto-fit bounds ---------- */

const FitBounds = ({ points }: { points: LatLng[] }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, points]);

  return null;
};

/* ---------- helper: per-leg polyline arrow decorator ---------- */

const LegDecorator = ({ from, to, color }: { from: LatLng; to: LatLng; color: string }) => {
  const map = useMap();

  useEffect(() => {
    let decorator: L.Layer | null = null;

    import('leaflet-polylinedecorator')
      .then(() => {
        const polyline = L.polyline([
          [from.lat, from.lng],
          [to.lat, to.lng],
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ld = L as any;
        decorator = Ld.polylineDecorator(polyline, {
          patterns: [
            {
              offset: '50%',
              repeat: 0,
              symbol: Ld.Symbol.arrowHead({
                pixelSize: 14,
                polygon: false,
                pathOptions: { stroke: true, color, weight: 2 },
              }),
            },
          ],
        }) as L.Layer;
        decorator.addTo(map);
      })
      .catch(() => {
        // nice-to-have; swallow errors
      });

    return () => {
      if (decorator) map.removeLayer(decorator);
    };
  }, [map, from, to, color]);

  return null;
};

/* ---------- main component ---------- */

export const RouteMapModal = ({ open, onClose, stops }: RouteMapModalProps) => {
  const [geoState, setGeoState] = useState<GeoState>({ status: 'loading', completed: 0, total: 0 });
  const backdropRef = useRef<HTMLDivElement>(null);

  // Build deduplicated stop queries
  const stopQueries = useMemo(() => {
    const queries: { query: string; label: string; fallbackQuery?: string }[] = [];

    for (const stop of stops) {
      const parts: string[] = [];
      const isAirport = !!(stop.code && /^[A-Z]{3}$/i.test(stop.code));

      if (stop.label) {
        // For airports, append "Airport" to the name if not already present
        if (isAirport && !stop.label.toLowerCase().includes('airport')) {
          parts.push(`${stop.label} Airport`);
        } else {
          parts.push(stop.label);
        }
      }

      if (stop.city && stop.city.toLowerCase() !== stop.label.toLowerCase()) {
        parts.push(stop.city);
      }
      if (stop.country) parts.push(stop.country);

      const query = parts.join(', ').trim();
      const key = query.toLowerCase();

      // For 3-letter airport codes, provide a reliable fallback: "<CODE> airport"
      const fallbackQuery = isAirport
        ? `${stop.code!.toUpperCase()} airport${stop.city ? `, ${stop.city}` : ''}${stop.country ? `, ${stop.country}` : ''}`
        : undefined;

      // Deduplicate consecutive identical stops
      if (queries.length > 0 && queries[queries.length - 1].query.toLowerCase() === key) {
        continue;
      }
      queries.push({ query, label: stop.label, fallbackQuery });
    }
    return queries;
  }, [stops]);

  // Geocode on open
  useEffect(() => {
    if (!open || stopQueries.length === 0) return;

    const controller = new AbortController();
    let cancelled = false;

    setGeoState({ status: 'loading', completed: 0, total: stopQueries.length });

    (async () => {
      const results = await geocodeSequential(
        stopQueries,
        controller.signal,
        (completed, total) => {
          if (!cancelled) {
            setGeoState({ status: 'loading', completed, total });
          }
        },
      );

      if (cancelled) return;

      const successful = results.filter((r) => r.coords !== null);
      const failed = results.filter((r) => r.coords === null);

      if (successful.length === 0) {
        setGeoState({
          status: 'error',
          message: 'Unable to locate any stops on the map.',
          stops,
        });
      } else if (failed.length > 0) {
        setGeoState({ status: 'partial', geocoded: results, failed });
      } else {
        setGeoState({ status: 'ready', geocoded: results });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, stopQueries, stops]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  // Extract resolved points from geocoded results
  const geocoded: GeocodedStop[] =
    geoState.status === 'ready' || geoState.status === 'partial' ? geoState.geocoded : [];
  const resolvedPoints = geocoded.filter((g): g is GeocodedStop & { coords: LatLng } => g.coords !== null);

  // Build legs: consecutive pairs of resolved points for per-segment lines + arrows
  const legs: { from: LatLng; to: LatLng; transportLabel: string; color: string }[] = [];
  if (resolvedPoints.length >= 2) {
    for (let i = 0; i < resolvedPoints.length - 1; i++) {
      const fromLabel = resolvedPoints[i].label;
      let transport = '';

      // Walk stops to find the transport after the matching stop
      for (let s = 0; s < stops.length; s++) {
        if (stops[s].label === fromLabel && stops[s].transportAfter) {
          transport = stops[s].transportAfter ?? '';
          break;
        }
      }

      legs.push({
        from: resolvedPoints[i].coords,
        to: resolvedPoints[i + 1].coords,
        transportLabel: transport,
        color: getTransportColor(transport),
      });
    }
  }

  // Build Google Maps link with waypoints
  const gmapsUrl = (() => {
    if (resolvedPoints.length >= 2) {
      const origin = resolvedPoints[0].coords;
      const dest = resolvedPoints[resolvedPoints.length - 1].coords;
      const waypoints = resolvedPoints.slice(1, -1).map((p) => p.coords);
      return googleMapsDirectionsUrl(origin, dest, waypoints.length > 0 ? waypoints : undefined);
    }
    if (resolvedPoints.length === 1) {
      return googleMapsSearchUrl(`${resolvedPoints[0].coords.lat},${resolvedPoints[0].coords.lng}`);
    }
    if (stops.length > 0) {
      return googleMapsSearchUrl(stops[0].label);
    }
    return '';
  })();

  const showMap = resolvedPoints.length >= 1;

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="presentation"
    >
      <div
        className="modal route-map-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Route on map"
      >
        <div className="modal-header">
          <h3>Route on map</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost">
            ✕
          </button>
        </div>

        <div className="modal-content">
          {/* Loading state */}
          {geoState.status === 'loading' && (
            <div className="map-placeholder" style={{ height: 420 }}>
              <p>
                Locating stops ({geoState.completed}/{geoState.total})…
              </p>
            </div>
          )}

          {/* Full error state */}
          {geoState.status === 'error' && (
            <div className="map-placeholder map-error" style={{ height: 420 }}>
              <p className="error-text">{geoState.message}</p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                Try opening in Google Maps instead:
              </p>
              <div className="map-fallback-links">
                {geoState.stops.map((s, i) => (
                  <a
                    key={i}
                    href={googleMapsSearchUrl(s.label)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                  >
                    {s.label} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Partial warning */}
          {geoState.status === 'partial' && (
            <div className="map-warning">
              <p>
                ⚠ Could not locate:{' '}
                {geoState.failed.map((f) => `"${f.label}"`).join(', ')}.
                Showing partial route.
              </p>
            </div>
          )}

          {/* Map */}
          {showMap && (
            <MapContainer
              style={{ height: 420, borderRadius: 8 }}
              center={[resolvedPoints[0].coords.lat, resolvedPoints[0].coords.lng]}
              zoom={6}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Markers with numbered icons */}
              {resolvedPoints.map((point, idx) => (
                <Marker
                  key={idx}
                  position={[point.coords.lat, point.coords.lng]}
                  icon={numberedIcon(idx + 1)}
                >
                  <Tooltip direction="top" offset={[0, -14]} permanent={false}>
                    {idx + 1}. {point.label}
                  </Tooltip>
                </Marker>
              ))}

              {/* Colored per-leg polylines */}
              {legs.map((leg, idx) => (
                <Polyline
                  key={`seg-${idx}`}
                  positions={[
                    [leg.from.lat, leg.from.lng],
                    [leg.to.lat, leg.to.lng],
                  ]}
                  pathOptions={{ color: leg.color, weight: 3, dashArray: '8 6' }}
                />
              ))}

              {/* Invisible wide per-leg hit area with transport tooltip */}
              {legs.map((leg, idx) => (
                <Polyline
                  key={`leg-${idx}`}
                  positions={[
                    [leg.from.lat, leg.from.lng],
                    [leg.to.lat, leg.to.lng],
                  ]}
                  pathOptions={{ color: 'transparent', weight: 16 }}
                >
                  {leg.transportLabel && (
                    <Tooltip sticky>{leg.transportLabel}</Tooltip>
                  )}
                </Polyline>
              ))}

              {/* Arrow decorators per leg */}
              {legs.map((leg, idx) => (
                <LegDecorator key={`dec-${idx}`} from={leg.from} to={leg.to} color={leg.color} />
              ))}

              {/* Transport icon at midpoint of each leg */}
              {legs.map((leg, idx) => {
                const mid = midpoint(leg.from, leg.to);
                return (
                  <Marker
                    key={`mid-${idx}`}
                    position={[mid.lat, mid.lng]}
                    icon={transportMidIcon(leg.transportLabel, leg.color)}
                    interactive={false}
                  />
                );
              })}

              <FitBounds points={resolvedPoints.map((p) => p.coords)} />
            </MapContainer>
          )}

          {/* Legend */}
          {showMap && legs.length > 0 && (
            <div className="map-legend">
              {legs.map((leg, idx) => (
                <span key={idx} className="map-legend-item">
                  <span className="map-legend-color" style={{ background: leg.color }} />
                  {leg.transportLabel || `Leg ${idx + 1}`}
                </span>
              ))}
            </div>
          )}

          {/* Google Maps link */}
          {(showMap || geoState.status === 'partial') && gmapsUrl && (
            <div className="map-fallback-links" style={{ marginTop: 8 }}>
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '0.85rem' }}
              >
                Open in Google Maps ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

