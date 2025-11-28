import React from 'react';
import '../styles/theme.css';

// PUBLIC_INTERFACE
export default function Transactions() {
  /** Placeholder Transactions page */
  return (
    <section className="panel" aria-labelledby="transactions-heading">
      <h1 id="transactions-heading">Transactions</h1>
      <p className="text-muted">List and manage your transactions.</p>
    </section>
  );
}
