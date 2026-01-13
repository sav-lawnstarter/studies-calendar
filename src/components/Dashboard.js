import React from 'react';

function Dashboard({ storyIdeas, competitorEntries }) {
  const avgScore = storyIdeas.length > 0
    ? (storyIdeas.reduce((sum, idea) => sum + idea.totalScore, 0) / storyIdeas.length).toFixed(1)
    : 0;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your editorial activities</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card green">
          <h3>Story Ideas</h3>
          <div className="stat-value">{storyIdeas.length}</div>
        </div>
        <div className="stat-card">
          <h3>Competitor Entries</h3>
          <div className="stat-value">{competitorEntries.length}</div>
        </div>
        <div className="stat-card green">
          <h3>Avg. Idea Score</h3>
          <div className="stat-value">{avgScore}/10</div>
        </div>
      </div>

      {storyIdeas.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Recent Story Ideas</h2>
          </div>
          {storyIdeas.slice(-3).reverse().map((idea) => (
            <div key={idea.id} className="idea-card">
              <h3>{idea.title}</h3>
              <p>{idea.description}</p>
              <div className="idea-scores">
                <span className="idea-score-badge">SEO: {idea.seoScore}/5</span>
                <span className="idea-score-badge">Timeliness: {idea.timelinessScore}/5</span>
                <span className="idea-score-badge total">Total: {idea.totalScore}/10</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {storyIdeas.length === 0 && competitorEntries.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <h3>Welcome to LawnStarter Editorial Dashboard</h3>
            <p>Start by adding story ideas or logging competitor content</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
