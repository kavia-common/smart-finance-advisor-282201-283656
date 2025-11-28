import React from 'react';
import '../styles/theme.css';

// PUBLIC_INTERFACE
export default function Dashboard() {
  /** Placeholder Dashboard page */
  return (
    <section className="panel" aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading">Dashboard</h1>
      <p className="text-muted">Overview of your finances will appear here.</p>
    </section>
  );
}
