import type { NormalizedSegment, RouteResponse, RouteSegmentResponse } from '../types';
import { apiFetch, isNetworkError } from './fetcher';
import { mockRoutes } from './mockStore';

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
  const query = new URLSearchParams(params).toString();

  try {
    return await apiFetch<RouteResponse[]>(`/api/routes?${query}`);
  } catch (error) {
    if (isNetworkError(error)) {
      return mockRoutes;
    }
    throw error;
  }
};
