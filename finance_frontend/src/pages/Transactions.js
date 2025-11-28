import React, { useEffect, useMemo, useState } from 'react';
import '../styles/theme.css';
import { useFinanceStore } from '../store/useFinanceStore';

/**
 * PUBLIC_INTERFACE
 * Transactions page: list, filter, and manage transactions with CRUD forms.
 * - Filters: date range (start/end), category, type (income/expense)
 * - Table with inline actions for edit/delete
 * - Add transaction form
 * - Prominent "Load Demo Data" CTA when empty state is detected
 * - Uses Zustand useFinanceStore actions and api client
 */
export default function Transactions() {
  const {
    transactions,
    loading,
    errors,
    fetchTransactions,
    createTx,
    updateTx,
    deleteTx,
    seedDemoLoad,
  } = useFinanceStore();

  // Filters
  const [filters, setFilters] = useState(() => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startObj = new Date(today);
    startObj.setDate(today.getDate() - 29);
    const start = startObj.toISOString().slice(0, 10);
    return { start, end, category: '', type: '' };
  });

  // Create/Edit modal states
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState(null); // transaction object or null
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Local derived flags
  const isLoading = loading.transactions;
  const txError = errors.transactions;

  // Fetch on mount and when filters change
  useEffect(() => {
    const params = {
      start: filters.start || undefined,
      end: filters.end || undefined,
      category: filters.category || undefined,
      // backend does not support 'type' filter directly; we filter client-side
    };
    fetchTransactions(params).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.start, filters.end, filters.category]);

  // Client-side filter by type (since API spec doesn't include 'type' query)
  const filtered = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    if (!filters.type) return transactions;
    return transactions.filter((t) => (t.type || 'expense') === filters.type);
  }, [transactions, filters.type]);

  const hasData = Array.isArray(filtered) && filtered.length > 0;

  // Categories list (derive from transactions for convenience)
  const categoryOptions = useMemo(() => {
    const set = new Set();
    (transactions || []).forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const resetForm = () => {
    setIsAdding(false);
    setEditing(null);
    setFormError(null);
    setSubmitting(false);
  };

  // Handle create/update submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      date: formData.get('date') || undefined,
      amount: Number(formData.get('amount')),
      category: formData.get('category') || undefined,
      description: formData.get('description') || '',
      type: formData.get('type') || 'expense',
    };

    // Basic validation
    if (!payload.date || !payload.category || Number.isNaN(payload.amount)) {
      setFormError('Please provide Date, Category, and a numeric Amount.');
      setSubmitting(false);
      return;
    }

    try {
      if (editing) {
        await updateTx(editing.id, payload);
      } else {
        await createTx(payload);
      }
      resetForm();
      // refresh with current filters
      await fetchTransactions({
        start: filters.start || undefined,
        end: filters.end || undefined,
        category: filters.category || undefined,
      });
    } catch (e2) {
      setFormError(e2?.message || 'Failed to save transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteTx(id);
      await fetchTransactions({
        start: filters.start || undefined,
        end: filters.end || undefined,
        category: filters.category || undefined,
      });
    } catch (e2) {
      // error is handled in store; optionally show inline
      // eslint-disable-next-line no-alert
      alert(e2?.message || 'Failed to delete transaction');
    }
  };

  const handleLoadDemo = async () => {
    try {
      await seedDemoLoad({ months_back: 6, approx_total: 400, random_seed: 42 });
      await fetchTransactions();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to load demo data');
    }
  };

  return (
    <section className="transactions" aria-labelledby="transactions-heading">
      <h1 id="transactions-heading" className="visually-hidden">Transactions</h1>

      {/* Filters Panel */}
      <div className="panel" aria-label="Transaction filters">
        <div className="filters-row">
          <div className="control">
            <label htmlFor="start">Start</label>
            <input
              id="start"
              type="date"
              value={filters.start}
              onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))}
            />
          </div>
          <div className="control">
            <label htmlFor="end">End</label>
            <input
              id="end"
              type="date"
              value={filters.end}
              onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))}
            />
          </div>
          <div className="control">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">All</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="control">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="spacer" />
          <div className="actions">
            <button
              className="btn"
              onClick={() => { setIsAdding(true); setEditing(null); }}
            >
              ➕ Add Transaction
            </button>
          </div>
        </div>
        {txError && <div className="inline-error" role="alert">{txError.message || 'Failed to load transactions'}</div>}
      </div>

      {/* Empty state with Demo CTA */}
      {!isLoading && !hasData && !txError && (
        <div className="panel empty-panel" role="status" aria-live="polite">
          <div className="empty-hero">💳</div>
          <h2>No transactions yet</h2>
          <p className="text-muted">Get started by adding a transaction or quickly load realistic demo data.</p>
          <div className="empty-actions">
            <button className="btn" onClick={() => setIsAdding(true)}>Add your first transaction</button>
            <button className="btn secondary" onClick={handleLoadDemo}>Load Demo Data</button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="panel">
          <SmallSpinner label="Loading transactions..." />
        </div>
      ) : hasData ? (
        <div className="panel">
          <div className="table-responsive" role="region" aria-label="Transactions table">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Category</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="numeric">Amount</th>
                  <th scope="col" className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.description || '—'}</td>
                    <td><span className="pill">{t.category}</span></td>
                    <td>
                      <span className={`pill ${t.type === 'income' ? 'success' : 'warn'}`}>
                        {t.type || 'expense'}
                      </span>
                    </td>
                    <td className={`numeric ${t.type === 'income' ? 'pos' : 'neg'}`}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="actions-col">
                      <button
                        className="btn ghost"
                        onClick={() => { setEditing(t); setIsAdding(false); }}
                        aria-label={`Edit transaction ${t.id}`}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => handleDelete(t.id)}
                        aria-label={`Delete transaction ${t.id}`}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Modal/Form */}
      {(isAdding || editing) && (
        <Dialog onClose={resetForm} title={editing ? 'Edit Transaction' : 'Add Transaction'}>
          <form onSubmit={handleSubmit} className="tx-form">
            <div className="form-grid">
              <div className="control">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={editing?.date || ''}
                  required
                />
              </div>
              <div className="control">
                <label htmlFor="type">Type</label>
                <select id="type" name="type" defaultValue={editing?.type || 'expense'}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="control">
                <label htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.amount ?? ''}
                  required
                />
              </div>
              <div className="control">
                <label htmlFor="category">Category</label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  list="category-list"
                  defaultValue={editing?.category || ''}
                  placeholder="e.g., Groceries"
                  required
                />
                <datalist id="category-list">
                  {categoryOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="control span-2">
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  defaultValue={editing?.description || ''}
                  placeholder="Optional note"
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

      {/* Inline styles for Transactions page */}
      <style>{`
        .transactions .filters-row {
          display: flex;
          gap: var(--space-5);
          align-items: end;
          flex-wrap: wrap;
        }
        .transactions .control {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 160px;
        }
        .transactions input[type="date"],
        .transactions input[type="text"],
        .transactions input[type="number"],
        .transactions select {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          background: var(--color-surface);
          color: var(--color-text);
        }
        .transactions .spacer {
          flex: 1;
        }
        .transactions .actions {
          display: flex;
          gap: 8px;
        }

        .empty-panel {
          text-align: center;
        }
        .empty-hero {
          font-size: 42px;
          margin-bottom: var(--space-3);
        }
        .empty-actions {
          display: inline-flex;
          gap: 10px;
          margin-top: var(--space-4);
        }

        .table-responsive {
          width: 100%;
          overflow: auto;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
        }
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
        .numeric.pos { color: var(--color-success); }
        .numeric.neg { color: var(--color-error); }
        .actions-col {
          width: 1%;
          white-space: nowrap;
          text-align: right;
        }

        .pill {
          border: 1px solid var(--border-color);
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          background: rgba(30,58,138,0.06);
        }
        .pill.warn {
          background: rgba(220,38,38,0.08);
          border-color: rgba(220,38,38,0.2);
          color: var(--color-error);
        }
        .pill.success {
          background: rgba(5,150,105,0.08);
          border-color: rgba(5,150,105,0.2);
          color: var(--color-success);
        }

        /* Dialog */
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
        .tx-form .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-4);
        }
        .tx-form .form-grid .span-2 {
          grid-column: span 2;
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
 * formatCurrency helper
 */
function formatCurrency(n, currency = 'USD') {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}
