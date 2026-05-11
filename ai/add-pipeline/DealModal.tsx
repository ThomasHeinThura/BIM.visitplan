import { useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { canEdit } from '../lib/auth';
import type { CockpitClient, Deal, Stage } from '../types';

type Props = {
  deal: Deal | null;
  stages: Stage[];
  sectors: string[];
  periods: string[];
  clients: CockpitClient[];
  onSave: (data: Partial<Deal>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
  deleting?: boolean;
  error?: string | null;
};

type DealFormState = {
  name: string;
  value: number | string;
  stage: string;
  period: string;
  sector: string;
  clientId: string;
  notes: string;
  tags: string;
};

export function DealModal({ deal, stages, sectors, periods, clients, onSave, onDelete, onClose, saving = false, deleting = false, error = null }: Props) {
  const { authState } = useAuthContext();
  const editable = deal ? canEdit(deal, authState) : true;
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formData, setFormData] = useState<DealFormState>(() => deal ? {
    name: deal.name,
    value: deal.value,
    stage: deal.stage,
    period: deal.period,
    sector: deal.sector,
    clientId: deal.client?._id ?? '',
    notes: deal.notes ?? '',
    tags: deal.tags ?? '',
  } : {
    name: '',
    value: 0,
    stage: stages[0]?.slug || '',
    period: periods[0] || '',
    sector: sectors[0] || '',
    clientId: '',
    notes: '',
    tags: '',
  });
  const [tags, setTags] = useState<string[]>(() => deal?.tags ? deal.tags.split(',').map((t: string) => t.trim()) : []);
  const [tagInput, setTagInput] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    setFormData(deal ? {
      name: deal.name,
      value: deal.value,
      stage: deal.stage,
      period: deal.period,
      sector: deal.sector,
      clientId: deal.client?._id ?? '',
      notes: deal.notes ?? '',
      tags: deal.tags ?? '',
    } : {
      name: '',
      value: 0,
      stage: stages[0]?.slug || '',
      period: periods[0] || '',
      sector: sectors[0] || '',
      clientId: '',
      notes: '',
      tags: '',
    });
    setTags(deal?.tags ? deal.tags.split(',').map((t: string) => t.trim()) : []);
    setTagInput('');
    setShowDeleteConfirm(false);
    setIsClosing(false);
  }, [deal, periods, sectors, stages]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onClose();
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isClosing, onClose]);

  const startClose = () => {
    setIsClosing(true);
  };

  const requestClose = () => {
    if (saving || deleting || isClosing) {
      return;
    }

    startClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving || deleting || !editable) {
      return;
    }
    if (!formData.name.trim() || formData.value === '') {
      return;
    }
    try {
      await onSave({
        ...formData,
        value: Number(formData.value),
        client: formData.clientId ? { _id: formData.clientId, _model: 'clients' } : null,
        tags: tags.join(','),
      });
      startClose();
    } catch {
      // Parent state already captures and surfaces the error.
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePasteTags = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const newTags = pastedText.split(',').map((t: string) => t.trim()).filter((t: string) => t);
    const uniqueTags = [...new Set([...tags, ...newTags])];
    setTags(uniqueTags);
  };

  const handleDelete = async () => {
    if (!deal || !editable || deleting || saving) {
      return;
    }

    try {
      await onDelete(deal._id);
      startClose();
    } catch {
      // Parent state already captures and surfaces the error.
    }
  };

  const title = deal ? (editable ? 'Edit Deal' : 'View Deal') : 'New Deal';

  return (
    <div
      className={`deal-drawer-backdrop ${isMounted && !isClosing ? 'is-open' : ''}`}
      onClick={requestClose}
    >
      <aside
        className={`deal-drawer ${isMounted && !isClosing ? 'is-open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-drawer-title"
      >
        <div className="deal-drawer-header">
          <div>
            <p className="deal-drawer-kicker">{deal ? (editable ? 'Editing deal' : 'Deal details') : 'Creating deal'}</p>
            <h2 id="deal-drawer-title">{title}</h2>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={requestClose}
            disabled={saving || deleting}
            aria-label="Close drawer"
          >
            &times;
          </button>
        </div>

        {deal?.owner?.name && (
          <p className="deal-drawer-meta">Owner: {deal.owner.name}</p>
        )}

        {error && <div className="modal-error deal-drawer-error">{error}</div>}

        <form className="deal-drawer-form" onSubmit={handleSubmit}>
          <div className="deal-drawer-body">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={!editable}
              />
            </div>

            <div className="form-group">
              <label htmlFor="client">Client</label>
              <select
                id="client"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                disabled={!editable}
              >
                <option value="">No client</option>
                {clients.map((client: CockpitClient) => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="value">Value (USD) *</label>
              <input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0"
                required
                disabled={!editable}
              />
            </div>

            <div className="form-group">
              <label htmlFor="stage">Stage</label>
              <select
                id="stage"
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                disabled={!editable}
              >
                {stages.map(stage => (
                  <option key={stage._id} value={stage.slug}>{stage.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="period">Period</label>
              <select
                id="period"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                disabled={!editable}
              >
                {periods.length === 0
                  ? <option value="">No financial quarters configured</option>
                  : periods.map((period: string) => (
                    <option key={period} value={period}>{period}</option>
                  ))
                }
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sector">Sector</label>
              <select
                id="sector"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                disabled={!editable}
              >
                {sectors.length === 0
                  ? <option disabled value="">No sectors configured</option>
                  : sectors.map((sector: string) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))
                }
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                disabled={!editable}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onPaste={handlePasteTags}
                placeholder="Press Enter or comma to add"
                disabled={!editable}
              />
              <div className="tags-list">
                {tags.map((tag: string) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    {editable && (
                      <button type="button" onClick={() => handleRemoveTag(tag)}>&times;</button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {deal && editable && (
              <div className="delete-section">
                {showDeleteConfirm ? (
                  <>
                    <span className="delete-confirm">Delete this deal?</span>
                    <button
                      type="button"
                      className="btn-delete-confirm"
                      onClick={() => {
                        void handleDelete();
                      }}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Yes'}
                    </button>
                    <button type="button" className="btn-delete-cancel" onClick={() => setShowDeleteConfirm(false)}>No</button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="deal-drawer-footer">
            <div className="deal-drawer-footer-spacer" />
            <div className="modal-actions deal-drawer-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  requestClose();
                }}
              >
                {editable ? 'Cancel' : 'Close'}
              </button>
              {editable && (
                <button
                  type="submit"
                  className={`btn-save ${saving ? 'btn-loading' : ''}`}
                  disabled={saving || deleting}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
