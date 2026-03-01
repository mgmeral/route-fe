import { useEffect, useState } from 'react';
import { ApiError } from '../api/fetcher';
import {
  createTransportation,
  deleteTransportation,
  getTransportations,
  updateTransportation
} from '../api/transportations';
import { Modal } from '../layout/Modal';
import type { Transportation } from '../types';

const getError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (typeof error.details === 'string') {
      return error.details;
    }
    if (error.details && typeof error.details === 'object') {
      return JSON.stringify(error.details);
    }
    return error.message;
  }
  return 'Operation failed.';
};

export const TransportationsPage = () => {
  const [items, setItems] = useState<Transportation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Transportation | null>(null);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(await getTransportations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item: Transportation) => {
    setEditing(item);
    setName(String(item.name ?? ''));
    setFormError('');
    setModalOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }

    try {
      if (editing) {
        await updateTransportation(editing.id, { name: name.trim() });
      } else {
        await createTransportation({ name: name.trim() });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(getError(err));
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
      setError(getError(err));
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
      {error ? <p className="error-text">{error}</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{String(item.name ?? '')}</td>
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
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          {formError ? <p className="error-text">{formError}</p> : null}
          <button type="submit" className="btn">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
};
