import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  listProblems,
  getProblem,
  createAttempt,
  listAttemptsForLearner,
  createSubmission,
  getSubmission,
  getLatestSubmissionForAttempt,
  updateSubmission,
  resetStore
} from './store.js';
import { parseSubmission, parseDesignText } from './domain/parser.js';
import { deterministicEvaluate, buildOverallSummary, runCompositeEvaluation } from './domain/evaluator.js';

const app = express();
const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.get('/api/problems', (req, res) => {
  res.json(listProblems());
});

app.get('/api/problems/:id', (req, res) => {
  const problem = getProblem(req.params.id);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  return res.json(problem);
});

app.post('/api/attempts', (req, res) => {
  const { problemId, learnerId } = req.body || {};
  if (!problemId || !learnerId) {
    return res.status(400).json({ error: 'problemId and learnerId are required' });
  }

  const attempt = createAttempt(problemId, learnerId);
  return res.status(201).json(attempt);
});

app.get('/api/attempts', (req, res) => {
  const { learnerId, problemId } = req.query;
  if (!learnerId) {
    return res.status(400).json({ error: 'learnerId is required' });
  }

  const attempts = listAttemptsForLearner(String(learnerId), problemId ? String(problemId) : null).map(attempt => {
    const latestSubmission = getLatestSubmissionForAttempt(attempt.id);
    return {
      ...attempt,
      latestSubmission: latestSubmission ? {
        id: latestSubmission.id,
        status: latestSubmission.status,
        createdAt: latestSubmission.createdAt,
        dimensionScores: latestSubmission.feedback?.dimensions?.map(dim => ({
          name: dim.name,
          score: dim.score,
          source: dim.source
        })) || []
      } : null
    };
  });

  return res.json(attempts);
});

app.post('/api/attempts/:id/submissions', async (req, res) => {
  const { content } = req.body || {};
  const { getAttempt } = await import('./store.js');
  const targetAttempt = getAttempt(req.params.id);

  if (!targetAttempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }

  const submission = createSubmission(req.params.id, content);
  const graph = parseSubmission(content);
  const problem = getProblem(targetAttempt.problemId);
  const rubric = problem?.rubric || { expectedInterfaces: [], requirementChecklist: [], patternHints: [] };
  const deterministic = deterministicEvaluate(graph, rubric);

  updateSubmission(submission.id, {
    status: 'RUNNING',
    feedback: {
      dimensions: deterministic,
      overallSummary: buildOverallSummary(deterministic)
    }
  });

  const responsePayload = {
    id: submission.id,
    status: 'RUNNING',
    feedback: {
      dimensions: deterministic,
      overallSummary: buildOverallSummary(deterministic)
    }
  };

  res.status(202).json(responsePayload);

  void runCompositeEvaluation(submission.id, { updateSubmission }).catch(() => undefined);
});

app.get('/api/submissions/:id', (req, res) => {
  const submission = getSubmission(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  return res.json(submission);
});

app.post('/api/submissions/:id/retry', async (req, res) => {
  const submission = getSubmission(req.params.id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  if (submission.status !== 'FAILED') {
    return res.status(400).json({ error: 'Only failed submissions can be retried' });
  }

  const updated = await runCompositeEvaluation(submission.id, {
    retry: true,
    updateSubmission
  });
  return res.json(updated);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (existsSync(clientDistPath)) {
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`LLD Practice Platform API listening on http://localhost:${PORT}`);
  });
}

export { app, resetStore };
