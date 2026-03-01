import { useMemo, useState } from 'react';
import { ApiError } from '../api/fetcher';
import { getLocations } from '../api/locations';
import { normalizeSegment, searchRoutes } from '../api/routes';
import type { Location, RouteResponse } from '../types';
import { useEffect } from 'react';

interface ValidationErrors {
  originId?: string;
  destinationId?: string;
  tripDate?: string;
}

export const RoutesPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoadingLocations(true);
        setLocations(await getLocations());
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch locations.');
      } finally {
        setLoadingLocations(false);
      }
    })();
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
      setErrorMessage('');
      const data = await searchRoutes({ originId, destinationId, tripDate });
      setRoutes(data);
      setSelectedIndex(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to search routes.');
      }
    } finally {
      setLoadingRoutes(false);
    }
  };

  const selectedRoute = selectedIndex !== null ? routes[selectedIndex] : null;

  return (
    <div className="routes-page">
      <div className="card">
        <h2>Route Search</h2>
        <form className="route-search-form" onSubmit={onSearch}>
          <div className="route-form-row">
            <label>
              Origin
              <select value={originId} onChange={(event) => setOriginId(event.target.value)}>
                <option value="">Select origin</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.code}>
                    {location.name}
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
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Trip Date
              <input type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />
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
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </div>

      <div className="routes-layout">
        <section className="card">
          <h3>Available Routes</h3>
          {routes.length === 0 ? <p>No routes found.</p> : null}
          <div className="routes-list">
            {routes.map((route, index) => {
              const normalized = route.segments.map(normalizeSegment);
              const stops = normalized
                .slice(0, -1)
                .map((segment) => segment.locationLabel)
                .filter(Boolean);
              const routeLabel = stops.length ? `Via ${stops.join(', ')}` : 'Direct';

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
                  <strong>{route.from}</strong> → <strong>{route.to}</strong>
                  <span>{routeLabel}</span>
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
              <div className="timeline-item emphasis">
                <span className="dot" />
                <div>{selectedRoute.from}</div>
              </div>
              {selectedRoute.segments.map((segment, idx) => {
                const normalized = normalizeSegment(segment);
                return (
                  <div key={idx}>
                    <div className="timeline-item">
                      <span className="dot" />
                      <div>{normalized.transportLabel}</div>
                    </div>
                    <div className="timeline-item">
                      <span className="dot" />
                      <div>{normalized.locationLabel}</div>
                    </div>
                  </div>
                );
              })}
              <div className="timeline-item emphasis">
                <span className="dot" />
                <div>{selectedRoute.to}</div>
              </div>
            </div>
          )}
          <div className="panel-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPanelOpen(false)}>
              Close
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
