import React, { useEffect, useMemo, useState } from 'react';
import '../styles/theme.css';
import { useFinanceStore } from '../store/useFinanceStore';

// PUBLIC_INTERFACE
export default function Insights() {
  /**
   * Insights page
   * - Queries backend GET /analytics/behaviors via Zustand store
   * - Filters: start/end date (optional). API supports YYYY-MM-DD.
   * - Displays:
   *    • Top spending categories (bar list)
   *    • Most expensive day (date + total)
   *    • Income days count
   *    • Narrative summary of the above
   * - Ocean Professional styling, with loading/empty/error states.
   */

  const { behaviors, loading, errors, fetchBehaviors } = useFinanceStore();

  // Default range: last 30 days
  const [range, setRange] = useState(() => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startObj = new Date(today);
    startObj.setDate(today.getDate() - 29);
    const start = startObj.toISOString().slice(0, 10);
    return { start, end };
  });

  const isLoading = loading.summary; // fetchBehaviors currently uses 'summary' loading slot
  const err = errors.summary;

  // Fetch on mount and when range changes
  useEffect(() => {
    fetchBehaviors({
      start: range.start || undefined,
      end: range.end || undefined,
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const topCats = behaviors?.top_spending_categories || [];
  const mostExpensive = behaviors?.most_expensive_day || null;
  const incomeDays = typeof behaviors?.income_days_count === 'number' ? behaviors.income_days_count : null;

  const hasAny =
    (Array.isArray(topCats) && topCats.length > 0) ||
    !!mostExpensive ||
    (incomeDays !== null && incomeDays !== undefined);

  // Max for bar visualization
  const maxTop = useMemo(() => {
    if (!Array.isArray(topCats) || topCats.length === 0) return 0;
    return Math.max(...topCats.map((c) => Number(c.amount || 0)));
  }, [topCats]);

  // Build lightweight narratives
  const narrativeLines = useMemo(() => {
    const lines = [];
    if (Array.isArray(topCats) && topCats.length > 0) {
      const leader = topCats[0];
      if (leader) {
        lines.push(
          `Your highest spending category is ${leader.category} at ${formatCurrency(leader.amount)} over this period.`
        );
      }
    }
    if (mostExpensive?.date && mostExpensive?.total_spent != null) {
      lines.push(
        `The most expensive day was ${mostExpensive.date}, with total spending of ${formatCurrency(
          Number(mostExpensive.total_spent)
        )}.`
      );
    }
    if (typeof incomeDays === 'number') {
      lines.push(`You recorded income on ${incomeDays} day${incomeDays === 1 ? '' : 's'} in this range.`);
    }
    return lines;
  }, [topCats, mostExpensive, incomeDays]);

  return (
    <section className="insights" aria-labelledby="insights-heading">
      <h1 id="insights-heading" className="visually-hidden">Insights</h1>

      {/* Filters */}
      <div className="panel" aria-label="Insights Filters">
        <div className="filters-row">
          <div className="control">
            <label htmlFor="start">Start</label>
            <input
              id="start"
              type="date"
              value={range.start}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            />
          </div>
          <div className="control">
            <label htmlFor="end">End</label>
            <input
              id="end"
              type="date"
              value={range.end}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            />
          </div>
          <div className="spacer" />
          <div className="actions">
            <button
              className="btn ghost"
              onClick={() => {
                const today = new Date();
                const end = today.toISOString().slice(0, 10);
                const startObj = new Date(today);
                startObj.setDate(today.getDate() - 29);
                const start = startObj.toISOString().slice(0, 10);
                setRange({ start, end });
              }}
            >
              Reset to last 30 days
            </button>
          </div>
        </div>
        {err && (
          <div className="inline-error" role="alert">
            {err.message || 'Failed to load insights'}
          </div>
        )}
      </div>

      {/* Top Categories */}
      <div className="panel" aria-labelledby="topcats-heading">
        <div className="panel-header">
          <h2 id="topcats-heading">Top Spending Categories</h2>
          {isLoading && <SmallSpinner label="Computing top categories..." />}
        </div>
        {!isLoading && !err && (!topCats || topCats.length === 0) && (
          <EmptyState title="No category data" description="No spending detected for the selected range." />
        )}
        {!isLoading && !err && topCats && topCats.length > 0 && (
          <div className="bar-list" role="list" aria-label="Top categories by total spend">
            {topCats
              .slice()
              .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
              .map((c) => {
                const width = maxTop ? `${(Number(c.amount || 0) / maxTop) * 100}%` : '0%';
                return (
                  <div key={c.category} role="listitem" className="bar-item">
                    <div className="bar-label">
                      <span className="pill">{c.category}</span>
                      <span className="text-muted">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="bar-track" aria-hidden="true">
                      <div className="bar-fill" style={{ width }} title={`${c.category}: ${formatCurrency(c.amount)}`} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Spending Spikes / Most Expensive Day */}
      <div className="panel" aria-labelledby="spikes-heading">
        <div className="panel-header">
          <h2 id="spikes-heading">Spending Spikes</h2>
          {isLoading && <SmallSpinner label="Analyzing spikes..." />}
        </div>
        {!isLoading && !err && !mostExpensive && (
          <EmptyState title="No spikes detected" description="No especially costly day in the selected range." />
        )}
        {!isLoading && !err && mostExpensive && (
          <div className="list">
            <div className="list-item">
              <div className="list-row">
                <div className="list-primary">
                  <strong>Most expensive day</strong>
                  <div className="text-muted small">{mostExpensive.date}</div>
                </div>
                <div className="list-secondary">
                  <div className="pill warn">Spent {formatCurrency(Number(mostExpensive.total_spent || 0))}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Income Activity */}
      <div className="panel" aria-labelledby="income-heading">
        <div className="panel-header">
          <h2 id="income-heading">Income Activity</h2>
          {isLoading && <SmallSpinner label="Checking income days..." />}
        </div>
        {!isLoading && !err && (incomeDays === null || incomeDays === undefined) && (
          <EmptyState title="No income data" description="No income recorded for the selected period." />
        )}
        {!isLoading && !err && typeof incomeDays === 'number' && (
          <div className="summary-card" aria-live="polite">
            <div className="icon" aria-hidden="true" style={{ color: 'var(--color-success)' }}>💵</div>
            <div className="meta">
              <div className="title">Income days</div>
              <div className="value">{incomeDays}</div>
            </div>
          </div>
        )}
      </div>

      {/* Narrative Insights */}
      <div className="panel" aria-labelledby="narrative-heading">
        <div className="panel-header">
          <h2 id="narrative-heading">Narrative Insights</h2>
          {isLoading && <SmallSpinner label="Summarizing..." />}
        </div>
        {!isLoading && !err && !hasAny && (
          <EmptyState title="No insights available" description="Adjust the filters or add transactions to see insights." />
        )}
        {!isLoading && !err && hasAny && (
          <ul className="list">
            {narrativeLines.map((line, idx) => (
              <li key={idx} className="list-item">
                <div className="list-row">
                  <div className="list-primary">
                    {line}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Inline styles specific to Insights page */}
      <style>{`
        .insights .filters-row {
          display: flex;
          gap: var(--space-5);
          align-items: end;
          flex-wrap: wrap;
        }
        .insights .control {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 160px;
        }
        .insights input[type="date"], 
        .insights select {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          background: var(--color-surface);
          color: var(--color-text);
        }
        .insights .spacer { flex: 1; }
        .insights .actions { display: flex; gap: 8px; }

        .panel .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }

        .bar-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .bar-item .bar-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .bar-track {
          width: 100%;
          height: 10px;
          border-radius: var(--radius-sm);
          background: rgba(30,58,138,0.10);
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
        }

        .summary-card {
          background: var(--color-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          padding: var(--space-5);
          display: inline-flex;
          align-items: center;
          gap: var(--space-4);
        }
        .summary-card .icon { font-size: 24px; }
        .summary-card .meta { display: flex; flex-direction: column; gap: 4px; }
        .summary-card .title {
          color: var(--color-text-muted);
          font-size: 12px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .summary-card .value { font-size: 20px; font-weight: 700; }

        .list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .list-item {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
        }
        .list-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }
        .pill {
          border: 1px solid var(--border-color);
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          background: rgba(30,58,138,0.06);
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
 * formatCurrency helper
 */
function formatCurrency(n, currency = 'USD') {
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}
