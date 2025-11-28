import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Income summary card on root route', () => {
  render(<App />);
  const incomeLabel = screen.getByText(/income/i);
  expect(incomeLabel).toBeInTheDocument();
});
