import React from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/theme.css';

// PUBLIC_INTERFACE
export default function Sidebar() {
  /** Sidebar navigation for the dashboard. Highlights active route. */
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand" aria-label="Smart Finance Advisor">
        <span aria-hidden="true">💠</span>
        <span>Smart Finance</span>
      </div>

      <nav className="nav" aria-label="Primary">
        <NavLink end to="/" className={({ isActive }) => isActive ? 'active' : undefined}>
          <span aria-hidden="true">🏠</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : undefined}>
          <span aria-hidden="true">💳</span>
          <span>Transactions</span>
        </NavLink>
        <NavLink to="/budgets" className={({ isActive }) => isActive ? 'active' : undefined}>
          <span aria-hidden="true">🧾</span>
          <span>Budgets</span>
        </NavLink>
        <NavLink to="/goals" className={({ isActive }) => isActive ? 'active' : undefined}>
          <span aria-hidden="true">🎯</span>
          <span>Goals</span>
        </NavLink>
        <NavLink to="/insights" className={({ isActive }) => isActive ? 'active' : undefined}>
          <span aria-hidden="true">📈</span>
          <span>Insights</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : undefined}>
          <span aria-hidden="true">⚙️</span>
          <span>Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
}
