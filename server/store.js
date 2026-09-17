const problems = [];
const attempts = [];
const submissions = [];

const seedProblems = () => [
  {
    id: 'parking-lot',
    title: 'Parking Lot',
    description: 'Design a parking lot system with entry/exit control, occupancy tracking, and ticketing.',
    constraints: [
      'Vehicles must be tracked by plate and slot assignment.',
      'The system should support both entry and exit flows without blocking other vehicles.',
      'Auditability is important for ticket generation and vehicle departure.'
    ],
    rubric: {
      expectedInterfaces: ['Parkable', 'Ticketing', 'GateController'],
      requirementChecklist: [
        { id: 'parking-spaces', description: 'parking spaces and vehicle assignment' },
        { id: 'entry-exit', description: 'vehicle entry and exit flow' },
        { id: 'ticketing', description: 'ticket generation and billing' },
        { id: 'capacity', description: 'capacity and occupancy tracking' }
      ],
      patternHints: ['Use a parking spot manager', 'Separate gate decisions from ticket logic']
    }
  },
  {
    id: 'elevator',
    title: 'Elevator',
    description: 'Model elevator movement control and passenger requests in a building.',
    constraints: [
      'The controller must coordinate floor requests and direction decisions.',
      'Passengers should be served without violating safe movement assumptions.',
      'The design should scale to multiple floors and multiple passengers.'
    ],
    rubric: {
      expectedInterfaces: ['Requestable', 'MoveController', 'DoorController'],
      requirementChecklist: [
        { id: 'floor-requests', description: 'floor request handling' },
        { id: 'dispatcher', description: 'request dispatch and elevator movement' },
        { id: 'doors', description: 'door open and close behavior' },
        { id: 'passenger', description: 'passenger waiting and ride flow' }
      ],
      patternHints: ['Use a scheduler or dispatcher', 'Keep door and movement logic separate']
    }
  },
  {
    id: 'vending-machine',
    title: 'Vending Machine',
    description: 'Design a vending machine that can dispense items and manage payment states.',
    constraints: [
      'Payment and inventory states must be handled precisely.',
      'The machine should prevent invalid purchases and dispense only available items.',
      'The design should allow future item types without large rewrites.'
    ],
    rubric: {
      expectedInterfaces: ['Payable', 'Dispensable', 'InventoryAware'],
      requirementChecklist: [
        { id: 'inventory', description: 'inventory and stock management' },
        { id: 'payment', description: 'payment processing and validation' },
        { id: 'selection', description: 'product selection and dispense flow' },
        { id: 'state', description: 'state transitions for purchase lifecycle' }
      ],
      patternHints: ['Model payment and inventory as separate collaborators', 'Use a finite state machine for purchase flow']
    }
  }
];

export function resetStore() {
  problems.length = 0;
  attempts.length = 0;
  submissions.length = 0;

  seedProblems().forEach(problem => problems.push(problem));
}

export function listProblems() {
  return problems.map(({ id, title, description }) => ({ id, title, description }));
}

export function getProblem(problemId) {
  return problems.find(problem => problem.id === problemId) || null;
}

export function createAttempt(problemId, learnerId) {
  const attempt = {
    id: `attempt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    problemId,
    learnerId,
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString()
  };
  attempts.push(attempt);
  return attempt;
}

export function getAttempt(attemptId) {
  return attempts.find(attempt => attempt.id === attemptId) || null;
}

export function listAttemptsForLearner(learnerId, problemId = null) {
  return attempts
    .filter(attempt => attempt.learnerId === learnerId && (!problemId || attempt.problemId === problemId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createSubmission(attemptId, content) {
  const submission = {
    id: `submission-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    attemptId,
    format: 'TEXT',
    content,
    status: 'QUEUED',
    feedback: null,
    createdAt: new Date().toISOString()
  };
  submissions.push(submission);
  return submission;
}

export function getSubmission(submissionId) {
  return submissions.find(submission => submission.id === submissionId) || null;
}

export function getLatestSubmissionForAttempt(attemptId) {
  return [...submissions]
    .filter(submission => submission.attemptId === attemptId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

export function listSubmissionsForAttempt(attemptId) {
  return submissions.filter(submission => submission.attemptId === attemptId);
}

export function updateSubmission(submissionId, updates) {
  const submission = getSubmission(submissionId);
  if (!submission) {
    return null;
  }

  Object.assign(submission, updates);
  return submission;
}

resetStore();
