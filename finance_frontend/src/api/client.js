//
// PUBLIC_INTERFACE
// apiClient: Minimal fetch-based API client for the Smart Finance Advisor frontend.
//

/**
 * PUBLIC_INTERFACE
 * getBaseURL derives the API base URL from environment variables, with a sensible default.
 * - Priority: REACT_APP_API_URL > REACT_APP_BACKEND_URL > http://localhost:3001
 * Note: Ensure .env contains the appropriate variable for your environment.
 */
export function getBaseURL() {
  const envUrl =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    'http://localhost:3001';
  return envUrl.replace(/\/+$/, ''); // trim trailing slashes
}

/**
 * Build query string from an object, skipping null/undefined.
 */
function toQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      sp.append(k, String(v));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Normalize error payloads thrown by request helpers.
 */
function normalizeError(e) {
  if (e?.name === 'AbortError') {
    return { message: 'Request aborted', status: 0, details: null };
  }
  if (typeof e === 'object' && e?.message) {
    return { message: e.message, status: e.status || 0, details: e.details || null };
  }
  return { message: String(e), status: 0, details: null };
}

/**
 * Internal request function using fetch. Adds JSON headers and handles errors.
 */
async function request(path, { method = 'GET', params, body, signal } = {}) {
  const base = getBaseURL();
  const url = `${base}${path}${toQuery(params)}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  const init = {
    method,
    headers,
    signal,
  };

  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw normalizeError(e);
  }

  const isJSON = (res.headers.get('content-type') || '').includes('application/json');
  let data = null;
  try {
    data = isJSON ? await res.json() : await res.text();
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.detail || data.error)) ||
      `Request failed with status ${res.status}`;
    const err = { message, status: res.status, details: data || null };
    throw err;
  }

  return data;
}

// PUBLIC_INTERFACE
export const api = {
  /** Health check */
  health: () => request('/'),

  // Transactions
  listTransactions: (params) => request('/transactions', { method: 'GET', params }),
  getTransaction: (tx_id) => request(`/transactions/${tx_id}`, { method: 'GET' }),
  createTransaction: (payload) => request('/transactions', { method: 'POST', body: payload }),
  updateTransaction: (tx_id, payload) =>
    request(`/transactions/${tx_id}`, { method: 'PUT', body: payload }),
  deleteTransaction: (tx_id) => request(`/transactions/${tx_id}`, { method: 'DELETE' }),

  // Budgets
  listBudgets: (params) => request('/budgets', { method: 'GET', params }),
  upsertBudget: (payload) => request('/budgets', { method: 'POST', body: payload }),
  budgetSummary: (month) => request('/budgets/summary', { method: 'GET', params: { month } }),

  // Goals
  listGoals: () => request('/goals', { method: 'GET' }),
  createGoal: (payload) => request('/goals', { method: 'POST', body: payload }),
  updateGoal: (goal_id, payload) => request(`/goals/${goal_id}`, { method: 'PUT', body: payload }),
  deleteGoal: (goal_id) => request(`/goals/${goal_id}`, { method: 'DELETE' }),

  // Analytics
  analyticsSummary: (params) => request('/analytics/summary', { method: 'GET', params }),
  analyticsBehaviors: (params) => request('/analytics/behaviors', { method: 'GET', params }),

  // Alerts
  overspendingAlerts: (month) =>
    request('/alerts/overspending', { method: 'GET', params: { month } }),

  // Advice
  savingsAdvice: (period = 'month') =>
    request('/advice/savings', { method: 'GET', params: { period } }),
  goalsPlan: () => request('/advice/goals-plan', { method: 'GET' }),

  // Seeding
  seedDemoLoad: (payload) => request('/seed/demo/load', { method: 'POST', body: payload }),
  seedDemoClear: () => request('/seed/demo/clear', { method: 'DELETE' }),
};

export default api;
