# LLD Practice Platform

This prototype is a focused 2-day MVP for LLD practice. It helps a learner choose a design problem, submit a solution, review explainable feedback, and compare past attempts.

## Product goal
The platform focuses on the practice loop:

Choose problem → think/design → submit → review feedback → retry

The experience is intentionally narrow and centered on LLD-quality signals rather than a broad LMS or large-scale assessment system.

## What the prototype demonstrates
- Small set of seeded problems: Parking Lot, Elevator, and Vending Machine
- Learner starts an attempt and writes a design in plain text
- Submission flow with status tracking
- Deterministic evaluation plus LLM-assisted design feedback
- Attempt history so the learner can see how their scores evolve over time
- In-memory storage with a mechanical replacement seam for a real database later

## Prerequisites
- Node.js 18+

> Data resets on every server restart because the app uses an in-memory store rather than a database.

## Install

From the repo root:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

## Set environment variable

The app works without a paid API key by using deterministic feedback. Add `ANTHROPIC_API_KEY` only if you want optional Claude-based feedback.

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## Run the app

```bash
npm run dev
```

This starts:
- Backend API at http://localhost:4000
- Frontend at http://localhost:5173

## Run tests

```bash
npm test
```

## Deploy to Vercel

The project includes a Vercel configuration that builds the React client and runs the Express API as a serverless function.

1. Push this repository to GitHub.
2. Import the GitHub repository into Vercel.
3. Keep the project root set to the repository root.
4. Add `ANTHROPIC_API_KEY` in Vercel Project Settings → Environment Variables only if optional Claude feedback is required.
5. Deploy with the default production settings.

The Vercel deployment serves the app at the generated Vercel URL. The data store is in-memory, so data resets when the serverless instance is replaced.

## Design and implementation notes
- The core domain logic is separated from HTTP code so it remains unit-testable.
- The parser converts free-form text into a lightweight graph of classes, methods, interfaces, and relationships.
- Deterministic checks focus on coverage and structural warnings.
- LLM evaluation is used for higher-level reasoning such as responsibility separation and pattern fit.
- If evaluation takes time or fails, the app keeps the deterministic feedback and marks the submission as failed rather than blocking the learner.

## Where a real database could plug in

The persistence seam is intentionally isolated behind the functions in [server/store.js](server/store.js). A future MongoDB implementation can replace the in-memory module while preserving the same function contracts such as `getProblem`, `createAttempt`, `createSubmission`, and `updateSubmission`.

## Limitations
- The prototype uses an in-memory store only.
- The parser is heuristic-based and meant for demo usage, not production parsing of arbitrary design documents.
- The app is intentionally simple and monolithic for the 2-day scope.
