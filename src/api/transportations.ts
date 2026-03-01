import type { Transportation } from '../types';
import { apiFetch, isNetworkError } from './fetcher';
import { mockTransportations } from './mockStore';

export const getTransportations = async (): Promise<Transportation[]> => {
  try {
    return await apiFetch<Transportation[]>('/api/transportations');
  } catch (error) {
    if (isNetworkError(error)) {
      return mockTransportations;
    }
    throw error;
  }
};

export const createTransportation = async (payload: { name: string }) =>
  apiFetch<Transportation>('/api/transportations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const updateTransportation = async (id: string, payload: { name: string }) =>
  apiFetch<Transportation>(`/api/transportations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

export const deleteTransportation = async (id: string) =>
  apiFetch<void>(`/api/transportations/${id}`, {
    method: 'DELETE'
  });
