import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/fetcher';
import { createLocation, deleteLocation, getLocations, updateLocation } from '../api/locations';
import { Modal } from '../layout/Modal';
import { useToast } from '../layout/Toast';
import type { Location, LocationCreateRequest } from '../types';

// instead of using the helper functions from the package (which rely on
// `require` and caused runtime failures in dev mode) we import the raw JSON
// data directly. Vite handles JSON imports natively, so this works in both
// development and production.
import dataset from 'countries-cities/data.json';

// compute the list of countries once
const countryList: string[] = Object.keys((dataset as any).countries);

// helper to fetch cities for a country; returns an empty array if none exist
const lookupCities = (country: string): string[] => {
  return (dataset as any).countries[country] || [];
};


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
      const det = error.details as Record<string, unknown>;
      if (typeof det.message === 'string') return det.message;
      return error.message;
    }
    return error.message;
  }
  return 'Unexpected error occurred.';
};

export const LocationsPage = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationCreateRequest>(initialForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState('');
  const [showCityList, setShowCityList] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await getLocations());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load locations.', 'error');
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
    setCityOptions(lookupCities(location.country));
    setCityFilter('');
    setShowCityList(false);
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
    if (!form.country || !countryList.includes(form.country)) {
      return 'Please select a valid country.';
    }
    if (!form.city || form.city.length > 64) {
      return 'City is required and max 64 chars.';
    }
    // if we have cityOptions for this country, ensure the selected city is one
    if (cityOptions.length && !cityOptions.includes(form.city)) {
      return 'Please select a city from the list.';
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
      showToast(getErrorText(err), 'error');
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
      showToast(getErrorText(err), 'error');
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

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Country</th>
            <th>City</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((location) => (
            <tr key={location.id}>
              <td>{location.code.trim().length === 3 ? `${location.name} (${location.code.trim().toUpperCase()})` : location.name}</td>
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
            <select
              value={form.country}
              onChange={(event) => {
                const country = event.target.value;
                setForm((prev) => ({ ...prev, country, city: '' }));
                setCityOptions(country ? lookupCities(country) : []);
              }}
            >
              <option value="">Select country</option>
              {countryList.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={{ position: 'relative' }}>
            City
            <input
              value={form.city}
              onChange={(event) => {
                const val = event.target.value;
                setForm((prev) => ({ ...prev, city: val }));
                setCityFilter(val);
                setShowCityList(true);
              }}
              disabled={cityOptions.length === 0}
              onFocus={() => setShowCityList(true)}
            />
            {showCityList && cityFilter && cityOptions.length ? (
              <ul
                className="city-suggestions"
                style={{
                  position: 'absolute',
                  zIndex: 100,
                  background: 'white',
                  border: '1px solid #d1d5db',
                  width: '100%',
                  maxHeight: 200,
                  overflowY: 'auto',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none'
                }}
              >
                {cityOptions
                  .filter((c) => c.toLowerCase().includes(cityFilter.toLowerCase()))
                  .slice(0, 200)
                  .map((city) => (
                    <li
                      key={city}
                      style={{ padding: '4px 8px', cursor: 'pointer' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm((prev) => ({ ...prev, city }));
                        setCityFilter(city);
                        setShowCityList(false);
                      }}
                    >
                      {city}
                    </li>
                  ))}
              </ul>
            ) : null}
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
