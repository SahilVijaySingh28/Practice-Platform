export default function ProblemList({ problems, selectedProblem, onSelect }) {
  return (
    <aside className="sidebar">
      <h2>Problems</h2>
      <ul className="problem-list">
        {problems.map(problem => (
          <li key={problem.id}>
            <button
              className={selectedProblem?.id === problem.id ? 'problem-button selected' : 'problem-button'}
              onClick={() => onSelect(problem)}
              type="button"
            >
              {problem.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
