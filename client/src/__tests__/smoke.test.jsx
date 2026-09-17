import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App.jsx';

const mockProblems = [
  { id: 'parking-lot', title: 'Parking Lot', description: 'Design parking management system' }
];

describe('App smoke tests', () => {
  it('renders the problem list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProblems
    });

    render(<App />);

    const problemButton = await screen.findByRole('button', { name: 'Parking Lot' });
    expect(problemButton).toBeInTheDocument();
  });

  it('shows deterministic feedback after submission', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProblems
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'attempt-1', problemId: 'parking-lot', learnerId: 'demo' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'submission-1', status: 'RUNNING', feedback: { dimensions: [{ name: 'Requirement Coverage', score: 72, evidence: 'Covers parking layout', source: 'deterministic' }], overallSummary: 'Working draft' } })
      });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Parking Lot' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start Attempt' }));
    fireEvent.change(screen.getByLabelText('Design text'), { target: { value: 'class ParkingLot { parkVehicle() {} }' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Design' })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Design' }));

    await waitFor(() => {
      expect(screen.getByText('Requirement Coverage')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
