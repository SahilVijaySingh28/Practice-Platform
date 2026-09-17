export default function AttemptHistory({ history, problemId }) {
  if (!history.length) {
    return <section className="card"><h3>Attempt History</h3><p>No attempts yet.</p></section>;
  }

  return (
    <section className="card">
      <h3>Attempt History</h3>
      <table>
        <thead>
          <tr>
            <th>Attempt</th>
            <th>Created</th>
            <th>Scores</th>
          </tr>
        </thead>
        <tbody>
          {history.map(attempt => (
            <tr key={attempt.id}>
              <td>{attempt.id}</td>
              <td>{new Date(attempt.createdAt).toLocaleDateString()}</td>
              <td>
                {(attempt.latestSubmission?.dimensionScores || []).map(score => (
                  <div key={`${attempt.id}-${score.name}`} className="score-row">
                    {score.name}: {score.score}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
