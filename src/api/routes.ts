import type { NormalizedSegment, RouteResponse, RouteSegmentResponse } from '../types';
import { apiFetch } from './fetcher';

const transportKeys = ['transportationName', 'transportation', 'mode', 'type', 'name'] as const;
const locationKeys = ['to', 'destination', 'end', 'location', 'locationName', 'toName'] as const;

const extractLabel = (segment: RouteSegmentResponse, keys: readonly string[]) => {
  for (const key of keys) {
    const value = segment[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return JSON.stringify(segment);
};

export const normalizeSegment = (segment: RouteSegmentResponse): NormalizedSegment => ({
  transportLabel: extractLabel(segment, transportKeys),
  locationLabel: extractLabel(segment, locationKeys)
});

export const searchRoutes = async (params: {
  originId: string;
  destinationId: string;
  tripDate: string;
}): Promise<RouteResponse[]> => {
  const queryParams = new URLSearchParams({
    from: params.originId,
    to: params.destinationId,
    date: params.tripDate
  }).toString();

  try {
    return await apiFetch<RouteResponse[]>(`/api/routes?${queryParams}`);
  } catch (error) {
    // propagate any error; do not default to mock data
    throw error;
  }
};
