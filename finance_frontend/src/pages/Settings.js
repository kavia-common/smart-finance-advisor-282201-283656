import React from 'react';
import '../styles/theme.css';

// PUBLIC_INTERFACE
export default function Settings() {
  /** Placeholder Settings page */
  return (
    <section className="panel" aria-labelledby="settings-heading">
      <h1 id="settings-heading">Settings</h1>
      <p className="text-muted">Manage your preferences and app settings.</p>
    </section>
  );
}
