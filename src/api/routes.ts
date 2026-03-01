import type { NormalizedSegment, RouteResponse, RouteSegmentResponse } from '../types';
import { apiFetch } from './fetcher';

const transportKeys = ['transportationName', 'transportation', 'mode', 'type', 'name'] as const;
const locationKeys = [
  'destinationName',
  'toName',
  'locationName',
  'to',
  'destination',
  'end',
  'location',
  'destinationCode'
] as const;

const extractLabel = (segment: RouteSegmentResponse, keys: readonly string[]) => {
  for (const key of keys) {
    const value = segment[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (value && typeof value === 'object') {
      const candidate = ['name', 'code', 'locationName']
        .map((nestedKey) => (value as Record<string, unknown>)[nestedKey])
        .find((nestedValue) => typeof nestedValue === 'string' && nestedValue.trim());
      if (typeof candidate === 'string') {
        return candidate;
      }
    }
  }
  return 'Unknown';
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
