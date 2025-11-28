import React, { useEffect, useMemo, useState } from 'react';
import '../styles/theme.css';
import { useFinanceStore } from '../store/useFinanceStore';

/**
 * PUBLIC_INTERFACE
 * Goals management page.
 * - List goals with progress
 * - Create/Update/Delete goal form (name, target_amount, current_amount, target_date)
 * - Projections panel using /advice/goals-plan (months_to_target, projected_completion, status)
 * - Loading/empty/error states with Ocean Professional styling
 */
export default function Goals() {
  const {
    goals,
    goalsPlan,
    loading,
    errors,
    fetchGoals,
    fetchGoalsPlan,
    createGoal,
    updateGoal,
    deleteGoal,
  } = useFinanceStore();

  // Local UI state
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState(null); // goal object
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const isLoadingGoals = loading.goals;
  const isLoadingPlan = loading.goalsPlan;

  useEffect(() => {
    // Initial load goals and plan
    Promise.allSettled([fetchGoals(), fetchGoalsPlan()]).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasGoals = Array.isArray(goals) && goals.length > 0;
  const planGoals = goalsPlan?.goals || [];
  const hasPlan = Array.isArray(planGoals) && planGoals.length > 0;

  // Join goals with plan info by id for display
  const goalsWithPlan = useMemo(() => {
    if (!hasGoals) return [];
    const planById = new Map();
    (planGoals || []).forEach((g) => planById.set(g.id, g));
    return (goals || []).map((g) => ({
      ...g,
      plan: planById.get(g.id) || null,
    }));
  }, [goals, planGoals, hasGoals]);

  // Helpers
  const resetForm = () => {
    setIsAdding(false);
    setEditing(null);
    setSubmitting(false);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: (fd.get('name') || '').trim(),
      target_amount: Number(fd.get('target_amount')),
      current_amount: fd.get('current_amount') === '' ? undefined : Number(fd.get('current_amount')),
      target_date: fd.get('target_date') || null,
    };

    if (!payload.name || Number.isNaN(payload.target_amount)) {
      setFormError('Please provide Name and a numeric Target Amount.');
      setSubmitting(false);
      return;
    }

    try {
      if (editing) {
        await updateGoal(editing.id, payload);
      } else {
        await createGoal(payload);
      }
      resetForm();
      await Promise.allSettled([fetchGoals(), fetchGoalsPlan()]);
    } catch (e2) {
      setFormError(e2?.message || 'Failed to save goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await deleteGoal(id);
      await Promise.allSettled([fetchGoals(), fetchGoalsPlan()]);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to delete goal');
    }
  };

  return (
    <section className="goals" aria-labelledby="goals-heading">
      <h1 id="goals-heading" className="visually-hidden">Goals</h1>

      {/* Actions */}
      <div className="panel" aria-label="Goal controls">
        <div className="controls-row">
          <div className="control">
            <div className="title-line">
              <strong>Goals</strong>
              {isLoadingGoals && <SmallSpinner label="Loading goals..." />}
            </div>
            <div className="text-muted small">Create and track your savings goals.</div>
          </div>
          <div className="spacer" />
          <div className="actions">
            <button className="btn" onClick={() => { setIsAdding(true); setEditing(null); }}>
              ➕ New Goal
            </button>
          </div>
        </div>
        {errors.goals && (
          <div className="inline-error" role="alert">
            {errors.goals.message || 'Failed to load goals'}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!isLoadingGoals && !hasGoals && !errors.goals && (
        <div className="panel empty-panel" role="status" aria-live="polite">
          <div className="empty-hero">🎯</div>
          <h2>No goals yet</h2>
          <p className="text-muted">Create goals to plan your savings and track progress.</p>
          <div className="empty-actions">
            <button className="btn" onClick={() => setIsAdding(true)}>Create your first goal</button>
          </div>
        </div>
      )}

      {/* Goals list */}
      {isLoadingGoals ? (
        <div className="panel">
          <SmallSpinner label="Loading goals..." />
        </div>
      ) : hasGoals ? (
        <div className="panel" aria-labelledby="goals-list-heading">
          <div className="panel-header">
            <h2 id="goals-list-heading">Your Goals</h2>
          </div>
          <div className="table-responsive" role="region" aria-label="Goals table">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Goal</th>
                  <th scope="col" className="numeric">Progress</th>
                  <th scope="col" className="numeric">Target</th>
                  <th scope="col">Target Date</th>
                  <th scope="col">Projection</th>
                  <th scope="col" className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {goalsWithPlan
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((g) => {
                    const progress = computeProgress(g.current_amount, g.target_amount);
                    const status = g.plan?.status || '—';
                    const months = g.plan?.months_to_target ?? null;
                    const completion = g.plan?.projected_completion || null;

                    return (
                      <tr key={g.id}>
                        <td>
                          <div className="goal-name">
                            <span className="pill">{g.name}</span>
                          </div>
                        </td>
                        <td className="numeric">
                          <div className="progress-wrap" title={`${progress.pct}%`}>
                            <div className="progress-label">
                              <span className="text-muted small">Saved</span>
                              <strong>{formatCurrency(g.current_amount || 0)}</strong>
                            </div>
                            <div className="progress-track" aria-hidden="true">
                              <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="numeric">{formatCurrency(g.target_amount)}</td>
                        <td>{g.target_date || '—'}</td>
                        <td>
                          {statusBadge(status, months, completion)}
                        </td>
                        <td className="actions-col">
                          <button
                            className="btn ghost"
                            onClick={() => { setEditing(g); setIsAdding(false); }}
                            aria-label={`Edit goal ${g.name}`}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn ghost"
                            onClick={() => handleDelete(g.id)}
                            aria-label={`Delete goal ${g.name}`}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Projections panel */}
      <div className="panel" aria-labelledby="projections-heading">
        <div className="panel-header">
          <h2 id="projections-heading">Projections</h2>
          {isLoadingPlan && <SmallSpinner label="Computing projections..." />}
        </div>
        {errors.goalsPlan && (
          <div className="inline-error" role="alert">
            {errors.goalsPlan.message || 'Failed to compute projections'}
          </div>
        )}
        {!isLoadingPlan && !hasPlan && !errors.goalsPlan && (
          <EmptyState
            title="No projections yet"
            description="Create at least one goal to view estimated timelines based on your baseline net savings."
          />
        )}
        {!isLoadingPlan && hasPlan && (
          <ul className="list">
            {planGoals.map((p) => (
              <li key={p.id} className="list-item">
                <div className="list-row">
                  <div className="list-primary">
                    <strong>{p.name}</strong>
                    <div className="text-muted small">
                      Remaining {formatCurrency(p.remaining)} • Status {p.status}
                    </div>
                  </div>
                  <div className="list-secondary">
                    <div className="pill">
                      {p.months_to_target != null ? `${p.months_to_target} mo` : '—'}
                    </div>
                    <div className="pill">
                      {p.projected_completion || '—'}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create / Edit Dialog */}
      {(isAdding || editing) && (
        <Dialog onClose={resetForm} title={editing ? 'Edit Goal' : 'Create Goal'}>
          <form onSubmit={handleSubmit} className="goal-form">
            <div className="form-grid">
              <div className="control">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={editing?.name || ''}
                  placeholder="e.g., Emergency Fund"
                  required
                />
              </div>
              <div className="control">
                <label htmlFor="target_amount">Target Amount</label>
                <input
                  id="target_amount"
                  name="target_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.target_amount ?? ''}
                  required
                />
              </div>
              <div className="control">
                <label htmlFor="current_amount">Current Amount</label>
                <input
                  id="current_amount"
                  name="current_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.current_amount ?? ''}
                  placeholder="0.00"
                />
              </div>
              <div className="control">
                <label htmlFor="target_date">Target Date</label>
                <input
                  id="target_date"
                  name="target_date"
                  type="date"
                  defaultValue={editing?.target_date || ''}
                />
              </div>
            </div>

            {formError && <div className="inline-error" role="alert">{formError}</div>}

            <div className="dialog-actions">
              <button type="button" className="btn ghost" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Inline styles for Goals page */}
      <style>{`
        .goals .controls-row {
          display: flex;
          gap: var(--space-5);
          align-items: end;
          flex-wrap: wrap;
        }
        .goals .control {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 220px;
        }
        .goals input[type="text"],
        .goals input[type="number"],
        .goals input[type="date"],
        .goals select {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          background: var(--color-surface);
          color: var(--color-text);
        }
        .goals .spacer { flex: 1; }
        .goals .actions { display: flex; gap: 8px; }
        .title-line { display: flex; align-items: center; gap: 10px; }

        .panel .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }

        .empty-panel { text-align: center; }
        .empty-hero { font-size: 42px; margin-bottom: var(--space-3); }
        .empty-actions { display: inline-flex; gap: 10px; margin-top: var(--space-4); }

        .table-responsive { width: 100%; overflow: auto; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td {
          border-bottom: 1px solid var(--border-color);
          padding: 10px 12px;
          text-align: left;
          vertical-align: middle;
        }
        .table thead th {
          font-size: 12px;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.02em;
          background: rgba(30,58,138,0.05);
        }
        .numeric {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .actions-col { width: 1%; white-space: nowrap; text-align: right; }

        .pill {
          border: 1px solid var(--border-color);
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          background: rgba(30,58,138,0.06);
        }
        .pill.success {
          background: rgba(5,150,105,0.08);
          border-color: rgba(5,150,105,0.2);
          color: var(--color-success);
        }
        .pill.warn {
          background: rgba(245,158,11,0.10);
          border-color: rgba(245,158,11,0.4);
          color: var(--color-secondary);
        }
        .pill.danger {
          background: rgba(220,38,38,0.10);
          border-color: rgba(220,38,38,0.4);
          color: var(--color-error);
        }

        .progress-wrap {
          min-width: 220px;
        }
        .progress-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .progress-track {
          width: 100%;
          height: 10px;
          border-radius: var(--radius-sm);
          background: rgba(30,58,138,0.10);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
        }

        /* Dialog shared with Transactions page for consistency */
        .dialog-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          display: grid;
          place-items: center;
          padding: 20px;
          z-index: 50;
        }
        .dialog {
          background: var(--color-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          max-width: 640px;
          width: 100%;
          padding: var(--space-5);
        }
        .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }
        .dialog-title {
          font-weight: 700;
          color: var(--color-primary);
        }
        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: var(--space-4);
        }
        .goal-form .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-4);
        }
        @media (max-width: 720px) {
          .goal-form .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .inline-error {
          border: 1px solid rgba(220,38,38,0.4);
          background: rgba(220,38,38,0.08);
          color: var(--color-error);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          margin: 6px 0 10px;
        }
        .empty { color: var(--color-text-muted); }

        .spinner {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .spinner-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--color-primary);
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        .visually-hidden { 
          position: absolute !important; height: 1px; width: 1px; overflow: hidden; 
          clip: rect(1px, 1px, 1px, 1px); white-space: nowrap; 
        }
      `}</style>
    </section>
  );
}

/**
 * PUBLIC_INTERFACE
 * SmallSpinner used in inline loading states.
 */
function SmallSpinner({ label = 'Loading...' }) {
  return (
    <span className="spinner" role="status" aria-label={label}>
      <span className="spinner-dot" />
      {label}
    </span>
  );
}

/**
 * PUBLIC_INTERFACE
 * EmptyState renders a compact empty state.
 */
function EmptyState({ title = 'No data', description = 'Nothing to display.' }) {
  return (
    <div className="empty" role="status" aria-live="polite">
      <strong>{title}</strong>
      <div className="text-muted">{description}</div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Simple Dialog component with accessible markup.
 */
function Dialog({ title, onClose, children }) {
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog">
        <div className="dialog-header">
          <div id="dialog-title" className="dialog-title">{title}</div>
          <button className="btn ghost" onClick={onClose} aria-label="Close dialog">✖</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * formatCurrency helper with USD default.
 */
function formatCurrency(n, currency = 'USD') {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

/**
 * PUBLIC_INTERFACE
 * Compute progress percentage.
 */
function computeProgress(current = 0, target = 0) {
  const c = Number(current || 0);
  const t = Number(target || 0);
  if (t <= 0) return { pct: 0 };
  const pct = Math.max(0, Math.min(100, (c / t) * 100));
  return { pct: Number(pct.toFixed(1)) };
}

/**
 * PUBLIC_INTERFACE
 * statusBadge renders status and projection info using tone colors.
 */
function statusBadge(status, months, completion) {
  if (!status) return <span className="pill">—</span>;
  const toneClass =
    status === 'ahead' ? 'success' :
    status === 'on_track' ? '' :
    status === 'behind' ? 'warn' :
    status === 'no_net' ? 'danger' : '';
  return (
    <div className="status-badges">
      <span className={`pill ${toneClass}`}>{statusLabel(status)}</span>
      <span className="pill">{months != null ? `${months} mo` : '—'}</span>
      <span className="pill">{completion || '—'}</span>
    </div>
  );
}

function statusLabel(s) {
  switch (s) {
    case 'ahead': return 'Ahead';
    case 'on_track': return 'On track';
    case 'behind': return 'Behind';
    case 'no_net': return 'No net savings';
    default: return s;
  }
}
