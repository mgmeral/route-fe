import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/fetcher';
import { createLocation, deleteLocation, getLocations, updateLocation } from '../api/locations';
import { Modal } from '../layout/Modal';
import type { Location, LocationCreateRequest } from '../types';

const initialForm: LocationCreateRequest = {
  code: '',
  name: '',
  country: '',
  city: ''
};

const getErrorText = (error: unknown) => {
  if (error instanceof ApiError) {
    if (typeof error.details === 'string') {
      return error.details;
    }
    if (error.details && typeof error.details === 'object') {
      return JSON.stringify(error.details);
    }
    return error.message;
  }
  return 'Unexpected error occurred.';
};

export const LocationsPage = () => {
  const [items, setItems] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationCreateRequest>(initialForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getLocations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const title = useMemo(() => (editing ? 'Edit Location' : 'Create Location'), [editing]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    setForm({ code: location.code, name: location.name, country: location.country, city: location.city });
    setFormError('');
    setModalOpen(true);
  };

  const validate = () => {
    if (!form.code || form.code.length < 3 || form.code.length > 16) {
      return 'Code is required (min 3, max 16).';
    }
    if (!form.name || form.name.length > 128) {
      return 'Name is required and max 128 chars.';
    }
    if (!form.country || form.country.length > 64) {
      return 'Country is required and max 64 chars.';
    }
    if (!form.city || form.city.length > 64) {
      return 'City is required and max 64 chars.';
    }
    return '';
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      if (editing) {
        await updateLocation(editing.id, form);
      } else {
        await createLocation(form);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getErrorText(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this location?')) {
      return;
    }
    try {
      await deleteLocation(id);
      await load();
    } catch (err) {
      setError(getErrorText(err));
    }
  };

  return (
    <div className="card">
      <div className="page-header">
        <h2>Locations</h2>
        <button type="button" className="btn" onClick={openCreate}>
          Create
        </button>
      </div>

      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Country</th>
            <th>City</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((location) => (
            <tr key={location.id}>
              <td>{location.code}</td>
              <td>{location.name}</td>
              <td>{location.country}</td>
              <td>{location.city}</td>
              <td>
                <div className="actions">
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(location)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => onDelete(location.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal title={title} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="form-grid" onSubmit={onSave}>
          <label>
            Code
            <input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          </label>
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label>
            Country
            <input
              value={form.country}
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
            />
          </label>
          <label>
            City
            <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
          </label>
          {formError ? <p className="error-text">{formError}</p> : null}
          <button disabled={saving} type="submit" className="btn">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
