import React from 'react';
import '../../styles/theme.css';

/**
 * PUBLIC_INTERFACE
 * Topbar component for the app. Accepts children (e.g., buttons) on the right side.
 */
export default function Topbar({ title = 'Dashboard', rightContent }) {
  return (
    <header className="topbar" role="banner">
      <div aria-live="polite" aria-atomic="true" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
        {title}
      </div>
      <div aria-label="Topbar actions">
        {rightContent}
      </div>
    </header>
  );
}
