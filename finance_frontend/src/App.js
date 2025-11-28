import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import './index.css';
import './styles/theme.css';

import Sidebar from './components/Layout/Sidebar';
import Topbar from './components/Layout/Topbar';

import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Insights from './pages/Insights';
import Settings from './pages/Settings';

/**
 * PUBLIC_INTERFACE
 * Main app component. Hosts router and the global theme toggle.
 */
function App() {
  const [theme, setTheme] = useState('light');

  // Apply theme to the document for CSS variables consumers
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <BrowserRouter>
      <Shell
        rightActions={(
          <button
            className="btn ghost"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        )}
      />
    </BrowserRouter>
  );
}

/**
 * Root layout shell that renders Sidebar, Topbar, and Outlet for pages.
 */
function Shell({ rightActions }) {
  const location = useLocation();
  const title = useMemo(() => {
    switch (true) {
      case location.pathname === '/':
        return 'Dashboard';
      case location.pathname.startsWith('/transactions'):
        return 'Transactions';
      case location.pathname.startsWith('/budgets'):
        return 'Budgets';
      case location.pathname.startsWith('/goals'):
        return 'Goals';
      case location.pathname.startsWith('/insights'):
        return 'Insights';
      case location.pathname.startsWith('/settings'):
        return 'Settings';
      default:
        return 'Smart Finance';
    }
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <Topbar title={title} rightContent={rightActions} />
      <main className="main" role="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <section className="panel" aria-labelledby="notfound-heading">
      <h1 id="notfound-heading">Page not found</h1>
      <p className="text-muted">The page you are looking for does not exist.</p>
    </section>
  );
}

export default App;
