import { useEffect, useState } from 'react';
import { getLocations } from '../api/locations';
import type { Location } from '../types';
import { ApiError } from '../api/fetcher';
import { useToast } from '../layout/Toast';
import {
  createTransportation,
  deleteTransportation,
  getTransportations,
  updateTransportation,
  TransportationPayload
} from '../api/transportations';
import { Modal } from '../layout/Modal';
import type { Transportation } from '../types';

// predefined transportation types supported by the backend
const TRANSPORT_TYPES = ['FLIGHT', 'BUS', 'SUBWAY', 'UBER'] as const;

// weekday bit values for encoding/decoding the `days` mask
const WEEKDAYS = [
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 4 },
  { name: 'Thursday', value: 8 },
  { name: 'Friday', value: 16 },
  { name: 'Saturday', value: 32 },
  { name: 'Sunday', value: 64 }
] as const;

// convert a numeric mask to a human-readable list of weekday names
const formatDays = (mask: number) => {
  if (!mask) return '';
  return WEEKDAYS.filter((d) => mask & d.value)
    .map((d) => d.name)
    .join(', ');
};

const getError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (typeof error.details === 'string') {
      return error.details;
    }
    if (error.details && typeof error.details === 'object') {
      const det = error.details as Record<string, unknown>;
      if (typeof det.message === 'string') return det.message;
      return error.message;
    }
    return error.message;
  }
  return 'Operation failed.';
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

const formatLocationValue = (value: unknown) => {
  if (value && typeof value === 'object') {
    const code = String((value as Record<string, unknown>).code ?? '').trim();
    const name = String((value as Record<string, unknown>).name ?? '').trim();
    if (code) {
      return formatNameCode(name || code, code);
    }
    return name || '';
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim().toUpperCase();
  }

  return '';
};

export const TransportationsPage = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<Transportation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [type, setType] = useState('');
  const [daysMask, setDaysMask] = useState(0);
  const [editing, setEditing] = useState<Transportation | null>(null);
  const [formError, setFormError] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await getTransportations());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Lokasyonları getir
    setLocationsLoading(true);
    getLocations()
      .then((locs) => setLocations(locs))
      .catch(() => setLocations([]))
      .finally(() => setLocationsLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setOrigin('');
    setDestination('');
    setType('');
    setDaysMask(0);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item: Transportation) => {
    setEditing(item);
    const originId = typeof item.origin === 'object' && item.origin?.id ? String(item.origin.id) : '';
    const destinationId = typeof item.destination === 'object' && item.destination?.id ? String(item.destination.id) : '';
    setOrigin(originId);
    setDestination(destinationId);
    setType(String(item.type ?? ''));
    setDaysMask(Number((item as any).operatingDaysMask ?? 0));
    setFormError('');
    setModalOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!origin.trim() || !destination.trim() || !type.trim() || daysMask === 0) {
      setFormError('All fields are required.');
      return;
    }

    const payload: TransportationPayload = {
      originLocationId: origin.trim(),
      destinationLocationId: destination.trim(),
      type: type.trim(),
      operatingDaysMask: daysMask
    };

    try {
      if (editing) {
        await updateTransportation(editing.id, payload);
      } else {
        await createTransportation(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      showToast(getError(err), 'error');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this transportation?')) {
      return;
    }
    try {
      await deleteTransportation(id);
      await load();
    } catch (err) {
      showToast(getError(err), 'error');
    }
  };

  return (
    <div className="card">
      <div className="page-header">
        <h2>Transportations</h2>
        <button className="btn" type="button" onClick={openCreate}>
          Create
        </button>
      </div>
      {loading ? <p>Loading...</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Origin</th>
            <th>Destination</th>
            <th>Type</th>
            <th>Days</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatLocationValue(item.origin)}</td>
              <td>{formatLocationValue(item.destination)}</td>
              <td>{String(item.type ?? '')}</td>
              <td>{formatDays(Number((item as any).operatingDaysMask ?? 0))}</td>
              <td>
                <div className="actions">
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(item)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => remove(item.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        title={editing ? 'Edit Transportation' : 'Create Transportation'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form className="form-grid" onSubmit={save}>
          <label>
            Origin
            <select value={origin} onChange={e => setOrigin(e.target.value)} required disabled={locationsLoading}>
              <option value="">Select origin</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {formatNameCode(loc.name, loc.code)} ({loc.city}, {loc.country})
                </option>
              ))}
            </select>
          </label>
          <label>
            Destination
            <select value={destination} onChange={e => setDestination(e.target.value)} required disabled={locationsLoading}>
              <option value="">Select destination</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {formatNameCode(loc.name, loc.code)} ({loc.city}, {loc.country})
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Type</legend>
            <div className="multi-control">
              {TRANSPORT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={type === t ? 'selected' : ''}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Days</legend>
            <div className="multi-control">
              {WEEKDAYS.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  className={daysMask & d.value ? 'selected' : ''}
                  onClick={() => setDaysMask((prev) => prev ^ d.value)}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </fieldset>
          {formError ? <p className="error-text">{formError}</p> : null}
          <button type="submit" className="btn">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
};
