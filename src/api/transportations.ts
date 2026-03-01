import type { Transportation } from '../types';
import { apiFetch} from './fetcher';

// payload type used for create/update operations; mirrors the fields we
// display/edit in the UI.
export interface TransportationPayload {
  originLocationId: string;
  destinationLocationId: string;
  type: string;
  // bitmask representing selected weekdays (Monday=1, Tuesday=2, ... Sunday=64)
  operatingDaysMask: number;
}

export const getTransportations = async (): Promise<Transportation[]> => {
  try {
    return await apiFetch<Transportation[]>('/api/transportations');
  } catch (error) {
    throw error;
  }
};

export const createTransportation = async (payload: TransportationPayload) =>
  apiFetch<Transportation>('/api/transportations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateTransportation = async (id: string, payload: TransportationPayload) =>
  apiFetch<Transportation>(`/api/transportations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteTransportation = async (id: string) =>
  apiFetch<void>(`/api/transportations/${id}`, {
    method: 'DELETE'
  });
