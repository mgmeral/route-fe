import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/fetcher';
import { getLocations } from '../api/locations';
import { normalizeSegment, searchRoutes } from '../api/routes';
import { useToast } from '../layout/Toast';
import type { Location, RouteResponse, RouteSegmentResponse } from '../types';
import { RouteMapModal, type RouteStop } from './RouteMapModal';

interface ValidationErrors {
  originId?: string;
  destinationId?: string;
  tripDate?: string;
}

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isAirportCode = (code: string) => /^[A-Za-z]{3}$/.test(code.trim());

const formatNameCode = (name: string, code: string) => {
  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase();
  if (!cleanName || cleanName.toUpperCase() === cleanCode) {
    return cleanCode;
  }
  return isAirportCode(cleanCode) ? `${cleanName} (${cleanCode})` : cleanName;
};

const getSegmentOriginData = (segment: RouteSegmentResponse) => {
  let code = '';
  let name = '';

  const codeKeys = ['originCode', 'fromCode'] as const;
  const nameKeys = ['originName', 'fromName'] as const;

  for (const key of codeKeys) {
    const value = segment[key];
    if (typeof value === 'string' && value.trim()) {
      code = value.trim().toUpperCase();
      break;
    }
  }

  for (const key of nameKeys) {
    const value = segment[key];
    if (typeof value === 'string' && value.trim()) {
      name = value.trim();
      break;
    }
  }

  const node = segment.origin ?? segment.from;
  if (node && typeof node === 'object') {
    const nestedCode = (node as Record<string, unknown>).code;
    const nestedName = (node as Record<string, unknown>).name;
    if (!code && typeof nestedCode === 'string' && nestedCode.trim()) {
      code = nestedCode.trim().toUpperCase();
    }
    if (!name && typeof nestedName === 'string' && nestedName.trim()) {
      name = nestedName.trim();
    }
  } else if (typeof node === 'string' && node.trim()) {
    const raw = node.trim();
    if (!code && raw.length === 3) {
      code = raw.toUpperCase();
    } else if (!name) {
      name = raw;
    }
  }

  return { code, name };
};

const getSegmentDestinationData = (segment: RouteSegmentResponse) => {
  let code = '';
  let name = '';

  const codeKeys = ['destinationCode', 'toCode'] as const;
  const nameKeys = ['destinationName', 'toName'] as const;

  for (const key of codeKeys) {
    const value = segment[key];
    if (typeof value === 'string' && value.trim()) {
      code = value.trim().toUpperCase();
      break;
    }
  }

  for (const key of nameKeys) {
    const value = segment[key];
    if (typeof value === 'string' && value.trim()) {
      name = value.trim();
      break;
    }
  }

  const node = segment.destination ?? segment.to;
  if (node && typeof node === 'object') {
    const nestedCode = (node as Record<string, unknown>).code;
    const nestedName = (node as Record<string, unknown>).name;
    if (!code && typeof nestedCode === 'string' && nestedCode.trim()) {
      code = nestedCode.trim().toUpperCase();
    }
    if (!name && typeof nestedName === 'string' && nestedName.trim()) {
      name = nestedName.trim();
    }
  } else if (typeof node === 'string' && node.trim()) {
    const raw = node.trim();
    if (!code && raw.length === 3) {
      code = raw.toUpperCase();
    } else if (!name) {
      name = raw;
    }
  }

  return { code, name };
};

const TRANSPORT_ICONS: Record<string, string> = {
  FLIGHT: '✈',
  BUS: '🚌',
  SUBWAY: '🚇',
  METRO: '🚇',
  TRAIN: '🚇',
  UBER: '🚗',
  TAXI: '🚗',
  CAR: '🚗',
};

const getTransportIcon = (type: string) => {
  const upper = type.toUpperCase();
  for (const [key, icon] of Object.entries(TRANSPORT_ICONS)) {
    if (upper.includes(key)) return icon;
  }
  return '🚏';
};

export const RoutesPage = () => {
  const { showToast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [tripDate, setTripDate] = useState(getTodayDate);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapModalOpen, setMapModalOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingLocations(true);
        const data = await getLocations(controller.signal);
        setLocations(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          showToast(error instanceof Error ? error.message : 'Failed to fetch locations.', 'error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingLocations(false);
        }
      }
    })();
    return () => { controller.abort(); };
  }, []);

  const validate = () => {
    const nextErrors: ValidationErrors = {};
    if (!originId) {
      nextErrors.originId = 'Origin is required.';
    }
    if (!destinationId) {
      nextErrors.destinationId = 'Destination is required.';
    }
    if (!tripDate) {
      nextErrors.tripDate = 'Trip date is required.';
    }
    if (originId && destinationId && originId === destinationId) {
      nextErrors.destinationId = 'Origin and destination must be different.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const isSearchDisabled = useMemo(
    () => !originId || !destinationId || !tripDate || originId === destinationId || loadingRoutes,
    [originId, destinationId, tripDate, loadingRoutes]
  );

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    try {
      setLoadingRoutes(true);
      const data = await searchRoutes({ originId, destinationId, tripDate });
      setRoutes(data);
      setSelectedIndex(data.length > 0 ? 0 : null);
      setPanelOpen(data.length > 0);
    } catch (error) {
      if (error instanceof ApiError) {
        showToast(error.message, 'error');
      } else {
        showToast('Unable to search routes.', 'error');
      }
    } finally {
      setLoadingRoutes(false);
    }
  };

  const selectedRoute = selectedIndex !== null ? routes[selectedIndex] : null;

  /** Look up a Location by code from the locations list. */
  const findLocation = useCallback(
    (code: string): Location | undefined =>
      locations.find((l) => l.code.toUpperCase() === code.toUpperCase()),
    [locations],
  );

  /**
   * Build the ordered list of RouteStop objects for a route.
   * Mirrors exactly what the timeline renders:
   *   route.from → seg[0].transport → seg[0].dest → seg[1].transport → seg[1].dest → …
   */
  const buildRouteStops = useCallback(
    (route: RouteResponse): RouteStop[] => {
      const stops: RouteStop[] = [];

      const pushStop = (label: string, code: string | undefined, transportAfter?: string) => {
        const loc = code ? findLocation(code) : undefined;
        const stop: RouteStop = {
          label: loc?.name ?? label,
          code: loc?.code ?? code,
          city: loc?.city,
          country: loc?.country,
          transportAfter,
        };
        // Deduplicate consecutive identical stops (by label, case-insensitive)
        const prev = stops.length > 0 ? stops[stops.length - 1] : null;
        if (prev && prev.label.toLowerCase() === stop.label.toLowerCase()) {
          if (transportAfter && !prev.transportAfter) {
            prev.transportAfter = transportAfter;
          }
          return;
        }
        stops.push(stop);
      };

      // First stop: route origin
      const originLoc = findLocation(route.from);
      const firstTransport = route.segments.length > 0
        ? normalizeSegment(route.segments[0]).transportLabel
        : undefined;
      pushStop(
        originLoc?.name ?? route.from,
        originLoc?.code ?? route.from,
        firstTransport,
      );

      // Each segment contributes its destination as the next stop.
      // The transport between stop[i] and stop[i+1] is segment[i].transportLabel.
      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        const segDest = getSegmentDestinationData(seg);
        const nextTransport = i < route.segments.length - 1
          ? normalizeSegment(route.segments[i + 1]).transportLabel
          : undefined;

        const destLabel = segDest.name || segDest.code || normalizeSegment(seg).locationLabel;
        pushStop(destLabel, segDest.code || undefined, nextTransport);
      }

      return stops;
    },
    [findLocation],
  );

  const locationNameByCode = useMemo(
    () =>
      new Map(
        locations
          .filter((location) => location.code && location.name)
          .map((location) => [location.code.toUpperCase(), location.name])
      ),
    [locations]
  );
  const getLocationName = (value: string) => locationNameByCode.get(value.toUpperCase()) ?? value;
  const formatLocationValue = (value: string) => {
    const code = value.trim().toUpperCase();
    const name = getLocationName(value);
    if (name !== value || isAirportCode(code)) {
      return formatNameCode(name, code);
    }
    return value;
  };

  return (
    <div className="routes-page">
      <div className="card">
        <h2>Routes Search</h2>
        <form className="route-search-form" onSubmit={onSearch}>
          <div className="route-form-row">
            <label>
              Origin
              <select value={originId} onChange={(event) => setOriginId(event.target.value)}>
                <option value="">Select origin</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.code}>
                    {formatNameCode(location.name, location.code)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Destination
              <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>
                <option value="">Select destination</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.code}>
                    {formatNameCode(location.name, location.code)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Trip Date
              <input type="date" lang="en-GB" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />
            </label>

            <button type="submit" className="btn" disabled={isSearchDisabled}>
              {loadingRoutes ? 'Searching...' : 'Search'}
            </button>
          </div>
          {errors.originId ? <p className="error-text">{errors.originId}</p> : null}
          {errors.destinationId ? <p className="error-text">{errors.destinationId}</p> : null}
          {errors.tripDate ? <p className="error-text">{errors.tripDate}</p> : null}
        </form>
        {loadingLocations ? <p>Loading locations...</p> : null}
      </div>

      <div className="routes-layout">
        <section className="card">
          <h3>Available Routes</h3>
          {routes.length === 0 ? <p>No routes found.</p> : null}
          <div className="routes-list">
            {routes.map((route, index) => {
              // Find the flight segment's origin for the "Via" label
              const flightSegment = route.segments.find(
                (seg) => normalizeSegment(seg).transportLabel.toUpperCase().includes('FLIGHT')
              );
              let viaLabel = formatLocationValue(route.from);
              
              if (flightSegment) {
                const { code, name } = getSegmentOriginData(flightSegment);
                const resolvedName = name || (code ? getLocationName(code) : '');
                if (code && code.length === 3 && resolvedName) {
                  viaLabel = formatNameCode(resolvedName, code);
                } else if (resolvedName) {
                  viaLabel = resolvedName;
                } else if (code) {
                  viaLabel = code.toUpperCase();
                }
              }

              return (
                <button
                  type="button"
                  key={`${route.from}-${route.to}-${index}`}
                  className={`route-row ${selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedIndex(index);
                    setPanelOpen(true);
                  }}
                >
                  <strong>Via {viaLabel}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`card timeline-panel ${panelOpen ? '' : 'hidden'}`}>
          <h3>Route Timeline</h3>
          {!selectedRoute ? (
            <p>Select a route to see details</p>
          ) : (
            <div className="timeline">
              <div className="timeline-item location emphasis">
                <span className="dot" />
                <div>{formatLocationValue(selectedRoute.from)}</div>
              </div>
              {selectedRoute.segments.map((segment, idx) => {
                const normalized = normalizeSegment(segment);
                const { code, name } = getSegmentDestinationData(segment);
                const resolvedName = name || (code ? getLocationName(code) : '');
                let displayLocation = '';
                
                if (code && code.length === 3 && resolvedName) {
                  displayLocation = formatNameCode(resolvedName, code);
                } else if (resolvedName) {
                  displayLocation = resolvedName;
                } else {
                  displayLocation = normalized.locationLabel;
                }

                return (
                  <div key={idx} className="timeline-group">
                    <div className="timeline-transport"><span className="transport-icon">{getTransportIcon(normalized.transportLabel)}</span> {normalized.transportLabel}</div>
                    <div className="timeline-item location">
                      <span className="dot" />
                      <div>{displayLocation}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="panel-actions">
            {selectedRoute && (
              <button
                type="button"
                className="btn"
                onClick={() => setMapModalOpen(true)}
              >
                Show on map
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setPanelOpen(false)}>
              Close
            </button>
          </div>
        </section>
      </div>

      {selectedRoute && (
        <RouteMapModal
          open={mapModalOpen}
          onClose={() => setMapModalOpen(false)}
          stops={buildRouteStops(selectedRoute)}
        />
      )}
    </div>
  );
};
