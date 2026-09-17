import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCompositeEvaluation } from '../domain/evaluator.js';
import { resetStore, createAttempt, createSubmission, getSubmission, listAttemptsForLearner } from '../store.js';

describe('Composite evaluation', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  it('stores deterministic feedback immediately and merges LLM feedback on success', async () => {
    const attempt = createAttempt('parking-lot', 'learner-1');
    const submission = createSubmission(attempt.id, 'class ParkingLot { }');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify({
            dimensions: [
              { name: 'Responsibility Separation', score: 88, evidence: 'good separation', source: 'llm' },
              { name: 'Coupling and Abstraction', score: 80, evidence: 'reasonable', source: 'llm' },
              { name: 'Extensibility', score: 82, evidence: 'extendable', source: 'llm' },
              { name: 'Pattern Fit', score: 78, evidence: 'matches observer pattern', source: 'llm' }
            ],
            overallSummary: 'Solid design.'
          })
        }]
      })
    }));

    const result = await runCompositeEvaluation(submission.id, { updateSubmission: (id, updates) => {
      const current = getSubmission(id);
      return Object.assign(current, updates);
    } });

    expect(result.status).toBe('EVALUATED');
    expect(getSubmission(submission.id).status).toBe('EVALUATED');
    expect(getSubmission(submission.id).feedback.dimensions.some(d => d.source === 'llm')).toBe(true);
  });

  it('leaves deterministic findings in place when the LLM times out', async () => {
    const attempt = createAttempt('parking-lot', 'learner-1');
    const submission = createSubmission(attempt.id, 'class ParkingLot { }');

    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 30);
    })));

    const result = await runCompositeEvaluation(submission.id, { updateSubmission: (id, updates) => {
      const current = getSubmission(id);
      return Object.assign(current, updates);
    } });

    expect(result.status).toBe('FAILED');
    expect(getSubmission(submission.id).status).toBe('FAILED');
    expect(getSubmission(submission.id).feedback.dimensions.some(d => d.source === 'deterministic')).toBe(true);
  });

  it('retries LLM evaluation on a failed submission', async () => {
    const attempt = createAttempt('parking-lot', 'learner-1');
    const submission = createSubmission(attempt.id, 'class ParkingLot { }');

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: JSON.stringify({
            dimensions: [{ name: 'Responsibility Separation', score: 85, evidence: 'better', source: 'llm' }],
            overallSummary: 'Improved.'
          }) }]
        })
      });

    vi.stubGlobal('fetch', fetchMock);

    await runCompositeEvaluation(submission.id, { updateSubmission: (id, updates) => {
      const current = getSubmission(id);
      return Object.assign(current, updates);
    } });

    const failed = getSubmission(submission.id);
    failed.status = 'FAILED';
    failed.feedback = { dimensions: [{ name: 'Requirement Coverage', score: 60, evidence: 'deterministic', source: 'deterministic' }], overallSummary: 'Partial' };

    const retryResult = await runCompositeEvaluation(submission.id, {
      updateSubmission: (id, updates) => {
        const current = getSubmission(id);
        return Object.assign(current, updates);
      },
      retry: true
    });

    expect(retryResult.status).toBe('EVALUATED');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
