import { render, screen } from '@testing-library/react';
import App from './App';

test("renders the homepage", async () => {
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: /welcome to olimpiada/i }),
  ).toBeInTheDocument();
});
