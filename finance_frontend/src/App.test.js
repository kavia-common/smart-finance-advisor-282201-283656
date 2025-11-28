import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Dashboard heading on root route', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /dashboard/i });
  expect(heading).toBeInTheDocument();
});
