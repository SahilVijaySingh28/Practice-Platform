import { useEffect, useMemo, useState } from 'react';
import ProblemList from './components/ProblemList.jsx';
import ProblemDetail from './components/ProblemDetail.jsx';
import AttemptHistory from './components/AttemptHistory.jsx';

const DEFAULT_LEARNER_ID = 'demo-learner';

export default function App() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/problems')
      .then(res => res.json())
      .then(data => {
        setProblems(data);
        if (data[0]) setSelectedProblem(data[0]);
      })
      .catch(() => setError('Failed to load problems.'));
  }, []);

  useEffect(() => {
    if (!selectedProblem || !attempt) return;
    fetch(`/api/attempts?learnerId=${encodeURIComponent(DEFAULT_LEARNER_ID)}&problemId=${encodeURIComponent(selectedProblem.id)}`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(() => setError('Failed to load attempt history.'));
  }, [selectedProblem, attempt]);

  const handleStartAttempt = async (problemId) => {
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemId, learnerId: DEFAULT_LEARNER_ID })
    });
    const data = await response.json();
    setAttempt(data);
    setSubmission(null);
    setError('');
  };

  const handleSubmitDesign = async (content) => {
    if (!attempt) return;

    const response = await fetch(`/api/attempts/${attempt.id}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    const data = await response.json();
    setSubmission(data);
    if (!data || !data.id) {
      setError('Submission failed.');
      return;
    }

    setError('');
    pollSubmission(data.id);
  };

  const pollSubmission = (submissionId) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/submissions/${submissionId}`);
      const data = await response.json();
      setSubmission(data);
      if (data.status === 'EVALUATED' || data.status === 'FAILED') {
        clearInterval(interval);
      }
    }, 2000);
  };

  const selectedProblemMemo = useMemo(() => selectedProblem, [selectedProblem]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>LLD Practice Platform</h1>
      </header>
      {error && <div className="error-box">{error}</div>}
      <div className="layout">
        <ProblemList problems={problems} selectedProblem={selectedProblemMemo} onSelect={setSelectedProblem} />
        <div className="content-panel">
          {selectedProblemMemo && (
            <ProblemDetail
              problem={selectedProblemMemo}
              attempt={attempt}
              onStartAttempt={handleStartAttempt}
              onSubmitDesign={handleSubmitDesign}
              submission={submission}
            />
          )}
          {selectedProblemMemo && <AttemptHistory history={history} problemId={selectedProblemMemo.id} />}
        </div>
      </div>
    </div>
  );
}
