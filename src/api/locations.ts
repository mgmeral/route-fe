import type { Location, LocationCreateRequest } from '../types';
import { apiFetch} from './fetcher';

export const getLocations = async (): Promise<Location[]> => {
  try {
    return await apiFetch<Location[]>('/api/locations');
  } catch (error) {
    throw error;
  }
};

export const createLocation = async (payload: LocationCreateRequest) =>
  apiFetch<Location>('/api/locations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateLocation = async (id: string, payload: LocationCreateRequest) =>
  apiFetch<Location>(`/api/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteLocation = async (id: string) =>
  apiFetch<void>(`/api/locations/${id}`, {
    method: 'DELETE'
  });
