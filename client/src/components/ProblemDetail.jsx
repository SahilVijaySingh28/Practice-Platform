import { useState } from 'react';

export default function ProblemDetail({ problem, attempt, onStartAttempt, onSubmitDesign, submission }) {
  const [designText, setDesignText] = useState('');

  return (
    <section className="card">
      <h2>{problem.title}</h2>
      <p>{problem.description}</p>
      <ul>
        {problem.constraints?.map(item => <li key={item}>{item}</li>)}
      </ul>

      {!attempt && (
        <button type="button" onClick={() => onStartAttempt(problem.id)}>
          Start Attempt
        </button>
      )}

      <div className="submission-panel">
        <label htmlFor="design-text">Design text</label>
        <textarea
          id="design-text"
          value={designText}
          onChange={(event) => setDesignText(event.target.value)}
          rows={10}
          placeholder="Describe classes, responsibilities, interfaces, relationships..."
        />
        <button type="button" onClick={() => onSubmitDesign(designText)} disabled={!attempt || !designText.trim()}>
          Submit Design
        </button>
      </div>

      {submission && (
        <div className="feedback-box">
          <h3>Feedback</h3>
          <p>Status: {submission.status}</p>
          {submission.feedback?.dimensions?.map(dimension => (
            <div key={`${dimension.name}-${dimension.source}`} className="dimension-pill">
              <strong>{dimension.name}</strong>
              <span>{dimension.score}/100</span>
              <p>{dimension.evidence}</p>
            </div>
          ))}
          {submission.feedback?.overallSummary && <p>{submission.feedback.overallSummary}</p>}
        </div>
      )}
    </section>
  );
}
