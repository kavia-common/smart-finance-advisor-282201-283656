import { create } from 'zustand';
import api from '../api/client';

/**
 * PUBLIC_INTERFACE
 * useFinanceStore provides global state and async actions for:
 * - summary (analytics summary)
 * - alerts (overspending)
 * - savingsAdvice
 * - transactions CRUD
 * - budgets (list, summary, upsert)
 * - goals CRUD and plan projections
 *
 * Usage:
 *   const { transactions, fetchTransactions, createTx } = useFinanceStore();
 *   useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
 */
export const useFinanceStore = create((set, get) => ({
  // Loading and error indicators
  loading: {
    summary: false,
    transactions: false,
    budgets: false,
    goals: false,
    alerts: false,
    advice: false,
    goalsPlan: false,
    seed: false,
  },
  errors: {
    summary: null,
    transactions: null,
    budgets: null,
    goals: null,
    alerts: null,
    advice: null,
    goalsPlan: null,
    seed: null,
  },

  // Data slices
  summary: null, // analytics summary
  behaviors: null, // analytics behaviors
  alerts: null, // overspending alerts
  savingsAdvice: null,
  goalsPlan: null,

  transactions: [],
  budgets: [],
  budgetSummary: null,
  goals: [],

  // Helpers to set loading/error
  _setLoading: (key, value) =>
    set((s) => ({ loading: { ...s.loading, [key]: value } })),
  _setError: (key, value) =>
    set((s) => ({ errors: { ...s.errors, [key]: value } })),

  // PUBLIC_INTERFACE
  // Analytics
  fetchSummary: async (params) => {
    const { _setLoading, _setError } = get();
    _setLoading('summary', true);
    _setError('summary', null);
    try {
      const data = await api.analyticsSummary(params);
      set({ summary: data });
      return data;
    } catch (e) {
      _setError('summary', e);
      throw e;
    } finally {
      _setLoading('summary', false);
    }
  },

  // PUBLIC_INTERFACE
  fetchBehaviors: async (params) => {
    const { _setLoading, _setError } = get();
    _setLoading('summary', true);
    _setError('summary', null);
    try {
      const data = await api.analyticsBehaviors(params);
      set({ behaviors: data });
      return data;
    } catch (e) {
      _setError('summary', e);
      throw e;
    } finally {
      _setLoading('summary', false);
    }
  },

  // PUBLIC_INTERFACE
  // Alerts & Advice
  fetchOverspendingAlerts: async (month) => {
    const { _setLoading, _setError } = get();
    _setLoading('alerts', true);
    _setError('alerts', null);
    try {
      const data = await api.overspendingAlerts(month);
      set({ alerts: data });
      return data;
    } catch (e) {
      _setError('alerts', e);
      throw e;
    } finally {
      _setLoading('alerts', false);
    }
  },

  // PUBLIC_INTERFACE
  fetchSavingsAdvice: async (period = 'month') => {
    const { _setLoading, _setError } = get();
    _setLoading('advice', true);
    _setError('advice', null);
    try {
      const data = await api.savingsAdvice(period);
      set({ savingsAdvice: data });
      return data;
    } catch (e) {
      _setError('advice', e);
      throw e;
    } finally {
      _setLoading('advice', false);
    }
  },

  // PUBLIC_INTERFACE
  fetchGoalsPlan: async () => {
    const { _setLoading, _setError } = get();
    _setLoading('goalsPlan', true);
    _setError('goalsPlan', null);
    try {
      const data = await api.goalsPlan();
      set({ goalsPlan: data });
      return data;
    } catch (e) {
      _setError('goalsPlan', e);
      throw e;
    } finally {
      _setLoading('goalsPlan', false);
    }
  },

  // PUBLIC_INTERFACE
  // Transactions
  fetchTransactions: async (params) => {
    const { _setLoading, _setError } = get();
    _setLoading('transactions', true);
    _setError('transactions', null);
    try {
      const data = await api.listTransactions(params);
      set({ transactions: data || [] });
      return data;
    } catch (e) {
      _setError('transactions', e);
      throw e;
    } finally {
      _setLoading('transactions', false);
    }
  },

  // PUBLIC_INTERFACE
  getTransactionById: (id) => {
    const { transactions } = get();
    return transactions.find((t) => t.id === id);
  },

  // PUBLIC_INTERFACE
  createTx: async (payload) => {
    const res = await api.createTransaction(payload);
    // refresh local state
    const items = await api.listTransactions();
    set({ transactions: items || [] });
    return res;
  },

  // PUBLIC_INTERFACE
  updateTx: async (id, payload) => {
    const res = await api.updateTransaction(id, payload);
    const items = await api.listTransactions();
    set({ transactions: items || [] });
    return res;
  },

  // PUBLIC_INTERFACE
  deleteTx: async (id) => {
    await api.deleteTransaction(id);
    const items = await api.listTransactions();
    set({ transactions: items || [] });
    return true;
  },

  // PUBLIC_INTERFACE
  // Budgets
  fetchBudgets: async (params) => {
    const { _setLoading, _setError } = get();
    _setLoading('budgets', true);
    _setError('budgets', null);
    try {
      const data = await api.listBudgets(params);
      set({ budgets: data || [] });
      return data;
    } catch (e) {
      _setError('budgets', e);
      throw e;
    } finally {
      _setLoading('budgets', false);
    }
  },

  // PUBLIC_INTERFACE
  upsertBudget: async (payload) => {
    const res = await api.upsertBudget(payload);
    // After upsert, consider refreshing related lists/summaries if month matches
    return res;
  },

  // PUBLIC_INTERFACE
  fetchBudgetSummary: async (month) => {
    const { _setLoading, _setError } = get();
    _setLoading('budgets', true);
    _setError('budgets', null);
    try {
      const data = await api.budgetSummary(month);
      set({ budgetSummary: data });
      return data;
    } catch (e) {
      _setError('budgets', e);
      throw e;
    } finally {
      _setLoading('budgets', false);
    }
  },

  // PUBLIC_INTERFACE
  // Goals
  fetchGoals: async () => {
    const { _setLoading, _setError } = get();
    _setLoading('goals', true);
    _setError('goals', null);
    try {
      const data = await api.listGoals();
      set({ goals: data || [] });
      return data;
    } catch (e) {
      _setError('goals', e);
      throw e;
    } finally {
      _setLoading('goals', false);
    }
  },

  // PUBLIC_INTERFACE
  createGoal: async (payload) => {
    const res = await api.createGoal(payload);
    const items = await api.listGoals();
    set({ goals: items || [] });
    return res;
  },

  // PUBLIC_INTERFACE
  updateGoal: async (id, payload) => {
    const res = await api.updateGoal(id, payload);
    const items = await api.listGoals();
    set({ goals: items || [] });
    return res;
  },

  // PUBLIC_INTERFACE
  deleteGoal: async (id) => {
    await api.deleteGoal(id);
    const items = await api.listGoals();
    set({ goals: items || [] });
    return true;
  },

  // PUBLIC_INTERFACE
  // Seed demo data helpers (optional but useful for first-run)
  seedDemoLoad: async (payload = { months_back: 6, approx_total: 500, random_seed: 42 }) => {
    const { _setLoading, _setError } = get();
    _setLoading('seed', true);
    _setError('seed', null);
    try {
      const res = await api.seedDemoLoad(payload);
      // Refresh primary screens after seeding
      await Promise.allSettled([
        get().fetchTransactions(),
        get().fetchGoals(),
      ]);
      return res;
    } catch (e) {
      _setError('seed', e);
      throw e;
    } finally {
      _setLoading('seed', false);
    }
  },

  // PUBLIC_INTERFACE
  seedDemoClear: async () => {
    const { _setLoading, _setError } = get();
    _setLoading('seed', true);
    _setError('seed', null);
    try {
      const res = await api.seedDemoClear();
      // Clear local state as well
      set({ transactions: [] });
      return res;
    } catch (e) {
      _setError('seed', e);
      throw e;
    } finally {
      _setLoading('seed', false);
    }
  },
}));

export default useFinanceStore;
