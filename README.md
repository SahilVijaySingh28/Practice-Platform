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

## AI Usage Notes

These notes summarize the meaningful AI-assisted decisions used during development.

### Decision 1
#### What was suggested
Keep persistence behind a small store module so the prototype can use memory now and a database later.

#### What I accepted/rejected
Accepted.

#### Why
This keeps the API and domain logic independent from the storage implementation.

---

### Decision 2
#### What was suggested
Separate parsing, deterministic evaluation, and HTTP routing into different modules.

#### What I accepted/rejected
Accepted.

#### Why
The separation made the evaluator easier to test and allowed feedback logic to evolve without changing the API routes.

---

### Decision 3
#### What was suggested
Use deterministic checks as the baseline and make Claude feedback optional.

#### What I accepted/rejected
Accepted.

#### Why
Learners can use the deployed app without paying for an API key, while Claude can still provide deeper feedback when configured.

---

### Decision 4
#### What was suggested
Use a focused React interface with problem selection, submission, feedback, and attempt history in one workflow.

#### What I accepted/rejected
Accepted.

#### Why
The practice loop is the core product requirement, so the UI should keep those steps visible and easy to repeat.

---

### Decision 5
#### What was suggested
Deploy the React client and Express API together through Vercel serverless functions.

#### What I accepted/rejected
Accepted with changes.

#### Why
This keeps deployment simple for the prototype. Vercel routing required a catch-all API function so nested API paths reach Express correctly.
