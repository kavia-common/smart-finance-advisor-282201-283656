import React, { useEffect, useMemo, useState } from 'react';
import '../styles/theme.css';
import { useFinanceStore } from '../store/useFinanceStore';

/**
 * PUBLIC_INTERFACE
 * Dashboard renders an overview of the user's finances using the global store.
 * It fetches and displays:
 * - Analytics summary (income, expenses, net_cash_flow, savings_rate, avg_daily_spend)
 * - Category breakdown (simple bar visualization)
 * - Overspending alerts for the current month
 * - Savings suggestions
 * Includes loading/empty states and basic inline error handling.
 */
export default function Dashboard() {
  const {
    summary,
    alerts,
    savingsAdvice,
    loading,
    errors,
    fetchSummary,
    fetchOverspendingAlerts,
    fetchSavingsAdvice,
  } = useFinanceStore();

  // Controls for timeframe. Keep it simple: last 30 days as default.
  const [range, setRange] = useState(() => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startObj = new Date(today);
    startObj.setDate(today.getDate() - 29);
    const start = startObj.toISOString().slice(0, 10);
    return { start, end, period: 'day' };
  });

  // Current YYYY-MM for monthly alerts
  const currentMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // Fetch data on mount and when range changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await Promise.allSettled([
          fetchSummary({ period: range.period, start: range.start, end: range.end }),
          fetchOverspendingAlerts(currentMonth),
          fetchSavingsAdvice('month'),
        ]);
      } catch {
        // Errors are handled via store; no-op here
      }
    };
    run();
    return () => {
      cancelled = true; // reserved for future cancellation logic
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.period, range.start, range.end, currentMonth]);

  // Helpers
  const totals = summary?.totals || null;
  const breakdown = summary?.category_breakdown || {};
  const hasBreakdown = breakdown && Object.keys(breakdown).length > 0;

  const alertsItems = alerts?.items || [];
  const hasAlerts = Array.isArray(alertsItems) && alertsItems.length > 0;

  const suggestions = savingsAdvice?.category_reductions || [];
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;

  // Visualization scale for category bars
  const maxCategoryVal = hasBreakdown
    ? Math.max(...Object.values(breakdown))
    : 0;

  // Loading flags
  const isLoadingSummary = loading.summary;
  const isLoadingAlerts = loading.alerts;
  const isLoadingAdvice = loading.advice;

  return (
    <section className="dashboard" aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading" className="visually-hidden">Dashboard</h1>

      {/* Date range controls */}
      <div className="panel" aria-label="Date range controls">
        <div className="controls-row">
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
          <div className="control">
            <label htmlFor="period">Aggregation</label>
            <select
              id="period"
              value={range.period}
              onChange={(e) => setRange((r) => ({ ...r, period: e.target.value }))}
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="cards-grid">
        <SummaryCard
          title="Income"
          value={formatCurrency(totals?.income)}
          loading={isLoadingSummary}
          errorMsg={errors.summary?.message}
          icon="💼"
          tone="primary"
        />
        <SummaryCard
          title="Expenses"
          value={formatCurrency(totals?.expenses)}
          loading={isLoadingSummary}
          errorMsg={errors.summary?.message}
          icon="💳"
          tone="secondary"
        />
        <SummaryCard
          title="Net Cash Flow"
          value={formatCurrency(totals?.net_cash_flow)}
          loading={isLoadingSummary}
          errorMsg={errors.summary?.message}
          icon="📊"
          tone={Number(totals?.net_cash_flow || 0) >= 0 ? 'success' : 'danger'}
        />
        <SummaryCard
          title="Savings Rate"
          value={summary ? `${formatPercent(summary.savings_rate)}%` : '—'}
          loading={isLoadingSummary}
          errorMsg={errors.summary?.message}
          icon="🏦"
          tone="primary"
        />
        <SummaryCard
          title="Avg Daily Spend"
          value={summary ? formatCurrency(summary.avg_daily_spend) : '—'}
          loading={isLoadingSummary}
          errorMsg={errors.summary?.message}
          icon="📆"
          tone="secondary"
        />
      </div>

      {/* Category Breakdown */}
      <div className="panel" aria-labelledby="breakdown-heading">
        <div className="panel-header">
          <h2 id="breakdown-heading">Category Breakdown</h2>
          {isLoadingSummary && <SmallSpinner label="Loading breakdown..." />}
        </div>
        {errors.summary && (
          <InlineError message={errors.summary.message || 'Failed to load summary'} />
        )}
        {!isLoadingSummary && !hasBreakdown && !errors.summary && (
          <EmptyState title="No data" description="No category spending found for the selected range." />
        )}
        {!isLoadingSummary && hasBreakdown && (
          <div className="bar-list" role="list" aria-label="Spending by category">
            {Object.entries(breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, val]) => (
                <div key={cat} role="listitem" className="bar-item">
                  <div className="bar-label">
                    <span>{cat}</span>
                    <span className="text-muted">{formatCurrency(val)}</span>
                  </div>
                  <div className="bar-track" aria-hidden="true">
                    <div
                      className="bar-fill"
                      style={{ width: maxCategoryVal ? `${(val / maxCategoryVal) * 100}%` : '0%' }}
                      title={`${cat}: ${formatCurrency(val)}`}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Overspending Alerts */}
      <div className="panel" aria-labelledby="alerts-heading">
        <div className="panel-header">
          <h2 id="alerts-heading">Overspending Alerts — {currentMonth}</h2>
          {isLoadingAlerts && <SmallSpinner label="Checking alerts..." />}
        </div>
        {errors.alerts && (
          <InlineError message={errors.alerts.message || 'Failed to load alerts'} />
        )}
        {!isLoadingAlerts && !hasAlerts && !errors.alerts && (
          <EmptyState
            title="All good"
            description="No overspending detected for your budgets this month."
          />
        )}
        {!isLoadingAlerts && hasAlerts && (
          <ul className="list">
            {alertsItems.map((item) => (
              <li key={`${item.category}-${item.month}`} className={`list-item severity-${item.severity}`}>
                <div className="list-row">
                  <div className="list-primary">
                    <strong>{item.category}</strong>
                    <div className="text-muted small">
                      Utilization: {formatPercent(item.utilization_pct)}%
                    </div>
                  </div>
                  <div className="list-secondary">
                    <div className="pill">
                      Budget {formatCurrency(item.budget)}
                    </div>
                    <div className="pill warn">
                      Spent {formatCurrency(item.spent)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Savings Suggestions */}
      <div className="panel" aria-labelledby="savings-heading">
        <div className="panel-header">
          <h2 id="savings-heading">Savings Suggestions</h2>
          {isLoadingAdvice && <SmallSpinner label="Loading suggestions..." />}
        </div>
        {errors.advice && (
          <InlineError message={errors.advice.message || 'Failed to load advice'} />
        )}
        {!isLoadingAdvice && !hasSuggestions && !errors.advice && (
          <EmptyState
            title="No suggestions yet"
            description="Once you have sufficient activity, tailored savings suggestions will appear here."
          />
        )}
        {!isLoadingAdvice && hasSuggestions && (
          <ul className="list">
            {suggestions.map((s) => (
              <li key={s.category} className="list-item">
                <div className="list-row">
                  <div className="list-primary">
                    <strong>{s.category}</strong>
                    <div className="text-muted small">
                      Current: {formatCurrency(s.current)}
                    </div>
                  </div>
                  <div className="list-secondary">
                    <div className="pill">
                      Reduce {formatPercent(s.suggested_reduction_pct)}%
                    </div>
                    <div className="pill success">
                      Save {formatCurrency(s.reduced_amount)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {savingsAdvice?.targets && (
          <div className="targets-row" aria-label="Savings targets by period">
            <div className="target-box">
              <div className="target-label">Daily target</div>
              <div className="target-value">{formatCurrency(savingsAdvice.targets.daily)}</div>
            </div>
            <div className="target-box">
              <div className="target-label">Weekly target</div>
              <div className="target-value">{formatCurrency(savingsAdvice.targets.weekly)}</div>
            </div>
            <div className="target-box">
              <div className="target-label">Monthly target</div>
              <div className="target-value">{formatCurrency(savingsAdvice.targets.monthly)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Inline styles specific to dashboard widgets (kept minimal; uses theme variables) */}
      <style>{`
        .visually-hidden { 
          position: absolute !important; height: 1px; width: 1px; overflow: hidden; 
          clip: rect(1px, 1px, 1px, 1px); white-space: nowrap; 
        }
        .dashboard .controls-row {
          display: flex;
          gap: var(--space-5);
          align-items: end;
          flex-wrap: wrap;
        }
        .dashboard .control {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 160px;
        }
        .dashboard input[type="date"], 
        .dashboard select {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          background: var(--color-surface);
          color: var(--color-text);
        }

        .cards-grid {
          margin-top: var(--space-6);
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--space-5);
        }
        @media (max-width: 1200px) {
          .cards-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .cards-grid { grid-template-columns: 1fr; }
        }

        .summary-card {
          background: var(--color-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          padding: var(--space-5);
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        .summary-card .icon {
          font-size: 24px;
        }
        .summary-card .meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .summary-card .title {
          color: var(--color-text-muted);
          font-size: 12px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .summary-card .value {
          font-size: 20px;
          font-weight: 700;
        }

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
        .list-primary .small {
          font-size: 12px;
        }
        .list-secondary {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
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

        .severity-warning { border-left: 4px solid var(--color-secondary); }
        .severity-critical { border-left: 4px solid var(--color-error); }
        .severity-normal { border-left: 4px solid rgba(30,58,138,0.4); }

        .targets-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          margin-top: var(--space-4);
        }
        @media (max-width: 720px) {
          .targets-row { grid-template-columns: 1fr; }
        }
        .target-box {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: var(--space-4);
          background: var(--color-surface);
          box-shadow: var(--shadow-sm);
        }
        .target-label {
          font-size: 12px;
          color: var(--color-text-muted);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .target-value {
          font-size: 18px;
          font-weight: 700;
        }

        .inline-error {
          border: 1px solid rgba(220,38,38,0.4);
          background: rgba(220,38,38,0.08);
          color: var(--color-error);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          margin: 6px 0 10px;
        }
        .empty {
          color: var(--color-text-muted);
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
 * SummaryCard displays a single metric with an icon.
 */
function SummaryCard({ title, value, loading, errorMsg, icon = '📊', tone = 'primary' }) {
  const toneStyle = useMemo(() => {
    switch (tone) {
      case 'success':
        return { color: 'var(--color-success)' };
      case 'danger':
        return { color: 'var(--color-error)' };
      case 'secondary':
        return { color: 'var(--color-secondary)' };
      case 'primary':
      default:
        return { color: 'var(--color-primary)' };
    }
  }, [tone]);

  return (
    <div className="summary-card" aria-live="polite" aria-busy={loading ? 'true' : 'false'}>
      <div className="icon" aria-hidden="true" style={toneStyle}>{icon}</div>
      <div className="meta">
        <div className="title">{title}</div>
        {loading ? (
          <SmallSpinner label="Loading..." />
        ) : errorMsg ? (
          <span className="inline-error" role="alert">{errorMsg}</span>
        ) : (
          <div className="value">{value ?? '—'}</div>
        )}
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
 * InlineError renders a compact error message block.
 */
function InlineError({ message }) {
  return <div className="inline-error" role="alert">{message}</div>;
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
  if (typeof n !== 'number') return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

/**
 * PUBLIC_INTERFACE
 * formatPercent helper that accepts raw number values (e.g., 42.5 returns "42.5").
 */
function formatPercent(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return Number(n.toFixed(1));
}
