import { parseSubmission } from './parser.js';

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function tokenize(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreCoverage(matchedCount, totalCount) {
  if (!totalCount) return 0;
  return Math.max(0, Math.min(100, Math.round((matchedCount / totalCount) * 100)));
}

function buildEvidenceFromText(label, matches) {
  if (!matches.length) {
    return `${label} is missing or not clearly represented.`;
  }
  return `${label} is covered by ${matches.join(', ')}.`;
}

function getGraphKeywords(graph) {
  return [
    ...graph.classes.flatMap(item => [item.name, ...item.fields, ...item.methods]),
    ...graph.interfaces,
    ...graph.relationships.flatMap(item => [item.from, item.to, item.kind])
  ].filter(Boolean);
}

export function deterministicEvaluate(graph, rubric) {
  const safeGraph = graph || { classes: [], interfaces: [], relationships: [] };
  const safeRubric = rubric || { expectedInterfaces: [], requirementChecklist: [], patternHints: [] };
  const graphKeywords = getGraphKeywords(safeGraph);
  const requirementDimensions = [];

  const requirementItems = safeRubric.requirementChecklist || [];
  const matchedRequirements = requirementItems.filter(item => {
    const tokens = tokenize(item.description);
    return tokens.some(token => graphKeywords.some(keyword => normalizeText(keyword).includes(token)));
  });

  const requirementCoverageScore = scoreCoverage(matchedRequirements.length, requirementItems.length);
  requirementDimensions.push({
    name: 'Requirement Coverage',
    score: requirementCoverageScore,
    evidence: matchedRequirements.length
      ? `Detected coverage for ${matchedRequirements.length}/${requirementItems.length} requirement areas.`
      : 'No requirement coverage was detected; the design likely misses key responsibilities.',
    source: 'deterministic'
  });

  const expectedInterfaces = safeRubric.expectedInterfaces || [];
  const matchedInterfaces = expectedInterfaces.filter(expected =>
    safeGraph.interfaces.some(interfaceName => normalizeText(interfaceName) === normalizeText(expected))
  );
  const interfaceScore = scoreCoverage(matchedInterfaces.length, expectedInterfaces.length);
  requirementDimensions.push({
    name: 'Interface Coverage',
    score: interfaceScore,
    evidence: matchedInterfaces.length
      ? `Expected interfaces are partially present: ${matchedInterfaces.join(', ')}.`
      : 'No expected interfaces are present in the structural graph.',
    source: 'deterministic'
  });

  const totalMembers = safeGraph.classes.reduce((total, current) => total + (current.fields?.length || 0) + (current.methods?.length || 0), 0);
  const flattened = safeGraph.classes.map(item => ({
    name: item.name,
    weight: (item.fields?.length || 0) + (item.methods?.length || 0)
  }));
  const highestClass = flattened.sort((a, b) => b.weight - a.weight)[0];
  const godClassScore = totalMembers > 0 && highestClass ? (highestClass.weight / totalMembers) * 100 : 0;
  if (godClassScore > 75) {
    requirementDimensions.push({
      name: 'God Class',
      score: Math.max(0, Math.min(100, 100 - Math.round(godClassScore))),
      evidence: `${highestClass.name} owns ${highestClass.weight} of ${totalMembers} class members, which suggests concentration of responsibility.`,
      source: 'deterministic'
    });
  }

  return requirementDimensions;
}

export function mergeDimensions(deterministicDimensions, llmDimensions) {
  const seen = new Map();
  const allDimensions = [...deterministicDimensions, ...(llmDimensions || [])];

  allDimensions.forEach(dimension => {
    const key = dimension.name;
    if (!seen.has(key)) {
      seen.set(key, dimension);
      return;
    }

    const existing = seen.get(key);
    if (existing.source === 'deterministic' && dimension.source === 'llm') {
      seen.set(key, dimension);
    }
  });

  return Array.from(seen.values());
}

export function buildOverallSummary(dimensions) {
  if (!dimensions || !dimensions.length) {
    return 'No evaluation details available yet.';
  }

  const avg = dimensions.reduce((total, item) => total + Number(item.score || 0), 0) / dimensions.length;
  return `Overall quality estimate: ${Math.round(avg)}/100 based on ${dimensions.length} dimensions.`;
}

export function llmEvaluate(graph, rubric, deterministicFindings = []) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const endpoint = 'https://api.anthropic.com/v1/messages';
  const payload = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `Return strict JSON only. Do not include markdown fences or prose. Evaluate this design graph using the rubric and the deterministic findings below. Focus on 4 dimensions: responsibility separation, coupling and abstraction quality, extensibility, and pattern fit. Return an object with {"dimensions":[{"name","score","evidence","source":"llm"}],"overallSummary":"..."}.\nGraph: ${JSON.stringify(graph)}\nRubric: ${JSON.stringify(rubric)}\nDeterministic findings: ${JSON.stringify(deterministicFindings)}`
      }
    ]
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  })
    .then(async response => {
      clearTimeout(timeout);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const responseText = data?.content?.[0]?.text || '{}';
      const jsonText = responseText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(jsonText);
      const dimensions = Array.isArray(result.dimensions) ? result.dimensions.map(d => ({
        ...d,
        source: 'llm'
      })) : [];

      return {
        dimensions,
        overallSummary: result.overallSummary || buildOverallSummary(dimensions)
      };
    })
    .catch(error => {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        const wrapped = new Error('LLM evaluation timed out after 20s');
        wrapped.name = 'LlmEvaluationTimeout';
        throw wrapped;
      }
      const wrapped = new Error(`LLM evaluation failed: ${error.message}`);
      wrapped.name = 'LlmEvaluationError';
      throw wrapped;
    });
}

export async function runCompositeEvaluation(submissionId, options = {}) {
  const submissionStore = options.store || null;
  const updateSubmissionHandler = options.updateSubmission || (() => null);
  const retry = Boolean(options.retry);

  let submission = null;
  if (submissionStore) {
    submission = submissionStore.getSubmission(submissionId);
  }

  if (!submission) {
    submission = globalThis.__lldSubmissionStore ? globalThis.__lldSubmissionStore.getSubmission(submissionId) : null;
  }

  if (!submission && typeof globalThis !== 'undefined') {
    const storeModule = await import('../store.js');
    submission = storeModule.getSubmission(submissionId);
  }

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  const attempt = (await import('../store.js')).getAttempt(submission.attemptId);
  const problem = attempt ? (await import('../store.js')).getProblem(attempt.problemId) : null;
  const graph = parseSubmission(submission.content);
  const rubric = problem?.rubric || { expectedInterfaces: [], requirementChecklist: [], patternHints: [] };

  const deterministic = deterministicEvaluate(graph, rubric);

  submission.status = 'RUNNING';
  submission.feedback = {
    dimensions: deterministic,
    overallSummary: buildOverallSummary(deterministic)
  };

  updateSubmissionHandler(submission.id, {
    status: submission.status,
    feedback: submission.feedback
  });

  try {
    const llmFeedback = await llmEvaluate(graph, rubric, deterministic);
    const merged = mergeDimensions(deterministic, llmFeedback.dimensions || []);
    submission.status = 'EVALUATED';
    submission.feedback = {
      dimensions: merged,
      overallSummary: llmFeedback.overallSummary || buildOverallSummary(merged)
    };
    updateSubmissionHandler(submission.id, {
      status: submission.status,
      feedback: submission.feedback
    });
    return submission;
  } catch (error) {
    submission.status = 'FAILED';
    if (retry && !submission.feedback) {
      submission.feedback = { dimensions: deterministic, overallSummary: buildOverallSummary(deterministic) };
    }
    updateSubmissionHandler(submission.id, {
      status: submission.status,
      feedback: submission.feedback
    });
    return submission;
  }
}
