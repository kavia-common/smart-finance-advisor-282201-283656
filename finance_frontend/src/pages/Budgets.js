import React, { useEffect, useMemo, useState } from 'react';
import '../styles/theme.css';
import { useFinanceStore } from '../store/useFinanceStore';

/**
 * PUBLIC_INTERFACE
 * Budgets management page.
 * - Month selector (YYYY-MM)
 * - List existing budgets for the month
 * - Form to create/update a category budget
 * - Summary with utilization bars colored by thresholds:
 *    green <70%, amber 70–90%, red >90%
 * - Loading/empty/error states with Ocean Professional styling
 */
export default function Budgets() {
  const {
    budgets,
    budgetSummary,
    loading,
    errors,
    fetchBudgets,
    fetchBudgetSummary,
    upsertBudget,
  } = useFinanceStore();

  // Current YYYY-MM default
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${y}-${m}`;
  });

  // Form states
  const [editing, setEditing] = useState(null); // { month, category, amount }
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch budgets and summary on mount / when month changes
  useEffect(() => {
    const params = { period: 'month', start: month };
    fetchBudgets(params).catch(() => {});
    fetchBudgetSummary(month).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const isLoadingBudgets = loading.budgets;
  const budgetsError = errors.budgets;

  const items = Array.isArray(budgets) ? budgets : [];
  const hasBudgets = items.length > 0;

  const summaryItems = budgetSummary?.items || [];
  const hasSummary = Array.isArray(summaryItems) && summaryItems.length > 0;

  // For utilization bars scale; use max of spent or budget to keep visuals reasonable
  const maxUtilBase = useMemo(() => {
    if (!hasSummary) return 0;
    return Math.max(
      ...summaryItems.map((i) => Math.max(Number(i.spent || 0), Number(i.budget || 0), 1))
    );
  }, [summaryItems, hasSummary]);

  // Helpers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      month: fd.get('month') || month,
      category: fd.get('category')?.trim(),
      amount: Number(fd.get('amount')),
    };

    if (!payload.month || !payload.category || Number.isNaN(payload.amount)) {
      setFormError('Please provide Month, Category, and a numeric Amount.');
      setSubmitting(false);
      return;
    }

    try {
      await upsertBudget(payload);
      // Refresh lists
      await Promise.allSettled([
        fetchBudgets({ period: 'month', start: payload.month }),
        fetchBudgetSummary(payload.month),
      ]);
      setEditing(null);
      e.currentTarget.reset();
    } catch (e2) {
      setFormError(e2?.message || 'Failed to save budget');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (b) => {
    setEditing({ month: b.month, category: b.category, amount: b.amount });
  };

  return (
    <section className="budgets" aria-labelledby="budgets-heading">
      <h1 id="budgets-heading" className="visually-hidden">Budgets</h1>

      {/* Controls */}
      <div className="panel" aria-label="Budget controls">
        <div className="controls-row">
          <div className="control">
            <label htmlFor="month">Month</label>
            <input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="spacer" />
          <div className="actions">
            <button
              className="btn"
              onClick={() => setEditing({ month, category: '', amount: '' })}
            >
              ➕ New Budget
            </button>
          </div>
        </div>
        {budgetsError && (
          <div className="inline-error" role="alert">
            {budgetsError.message || 'Failed to load budgets'}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="panel" aria-labelledby="summary-heading">
        <div className="panel-header">
          <h2 id="summary-heading">Summary — {month}</h2>
          {isLoadingBudgets && <SmallSpinner label="Loading summary..." />}
        </div>
        {!isLoadingBudgets && !hasSummary && !budgetsError && (
          <EmptyState title="No summary yet" description="Add budgets or transactions to see utilization." />
        )}
        {!isLoadingBudgets && hasSummary && (
          <ul className="util-list">
            {summaryItems
              .slice()
              .sort((a, b) => (b.utilization_pct || 0) - (a.utilization_pct || 0))
              .map((row) => {
                const pct = Number(row.utilization_pct || 0);
                const tone = pct > 90 ? 'danger' : pct >= 70 ? 'warn' : 'success';
                const width = maxUtilBase
                  ? `${Math.min(100, (Number(row.spent || 0) / maxUtilBase) * 100)}%`
                  : '0%';
                return (
                  <li key={row.category} className={`util-item ${tone}`}>
                    <div className="util-row">
                      <div className="util-label">
                        <strong>{row.category}</strong>
                        <div className="text-muted small">
                          Spent {formatCurrency(row.spent)} / Budget {formatCurrency(row.budget)} — {formatPercent(pct)}%
                        </div>
                      </div>
                      <div className="util-bar" aria-hidden="true">
                        <div className="util-fill" style={{ width }} />
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {/* Budgets List */}
      <div className="panel" aria-labelledby="list-heading">
        <div className="panel-header">
          <h2 id="list-heading">Budgets — {month}</h2>
          {isLoadingBudgets && <SmallSpinner label="Loading budgets..." />}
        </div>
        {!isLoadingBudgets && !hasBudgets && !budgetsError && (
          <EmptyState
            title="No budgets for this month"
            description="Create category budgets to track your spending."
          />
        )}
        {!isLoadingBudgets && hasBudgets && (
          <div className="table-responsive" role="region" aria-label="Budgets table">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="numeric">Amount</th>
                  <th scope="col" className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((b) => b.month === month) // defensive
                  .slice()
                  .sort((a, b) => a.category.localeCompare(b.category))
                  .map((b) => (
                  <tr key={`${b.month}-${b.category}`}>
                    <td><span className="pill">{b.category}</span></td>
                    <td className="numeric">{formatCurrency(b.amount)}</td>
                    <td className="actions-col">
                      <button
                        className="btn ghost"
                        onClick={() => startEdit(b)}
                        aria-label={`Edit budget ${b.category}`}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upsert Form */}
      {editing && (
        <div className="panel" aria-labelledby="form-heading">
          <div className="panel-header">
            <h2 id="form-heading">{editing?.id ? 'Update Budget' : 'Create/Update Budget'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="budget-form">
            <div className="form-grid">
              <div className="control">
                <label htmlFor="form-month">Month</label>
                <input
                  id="form-month"
                  name="month"
                  type="month"
                  defaultValue={editing?.month || month}
                  required
                />
              </div>
              <div className="control">
                <label htmlFor="form-category">Category</label>
                <input
                  id="form-category"
                  name="category"
                  type="text"
                  placeholder="e.g., Groceries"
                  defaultValue={editing?.category || ''}
                  required
                />
              </div>
              <div className="control">
                <label htmlFor="form-amount">Amount</label>
                <input
                  id="form-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.amount ?? ''}
                  required
                />
              </div>
            </div>

            {formError && <div className="inline-error" role="alert">{formError}</div>}

            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Budget'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline styles for Budgets page */}
      <style>{`
        .visually-hidden { 
          position: absolute !important; height: 1px; width: 1px; overflow: hidden; 
          clip: rect(1px, 1px, 1px, 1px); white-space: nowrap; 
        }
        .controls-row {
          display: flex;
          gap: var(--space-5);
          align-items: end;
          flex-wrap: wrap;
        }
        .control {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 160px;
        }
        input[type="month"],
        input[type="text"],
        input[type="number"],
        select {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          background: var(--color-surface);
          color: var(--color-text);
        }
        .spacer { flex: 1; }
        .actions { display: flex; gap: 8px; }

        .panel .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }

        .util-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .util-item {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
        }
        .util-item.success { border-left: 4px solid var(--color-success); }
        .util-item.warn { border-left: 4px solid var(--color-secondary); }
        .util-item.danger { border-left: 4px solid var(--color-error); }

        .util-row { display: flex; flex-direction: column; gap: 8px; }
        .util-label .small { font-size: 12px; }

        .util-bar {
          width: 100%;
          height: 10px;
          border-radius: var(--radius-sm);
          background: rgba(30,58,138,0.10);
          overflow: hidden;
        }
        .util-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
        }

        .table-responsive { width: 100%; overflow: auto; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td {
          border-bottom: 1px solid var(--border-color);
          padding: 10px 12px;
          text-align: left;
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

        .budget-form .form-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-4);
        }
        @media (max-width: 720px) {
          .budget-form .form-grid { grid-template-columns: 1fr; }
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: var(--space-4);
        }

        .inline-error {
          border: 1px solid rgba(220,38,38,0.4);
          background: rgba(220,38,38,0.08);
          color: var(--color-error);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          margin: 6px 0 10px;
        }

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
 * formatPercent helper returning fixed 1 decimal; input is raw number.
 */
function formatPercent(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return Number(n.toFixed(1));
}
