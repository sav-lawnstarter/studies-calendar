import React, { useState } from 'react';

function CompetitorLog({ entries, onAddEntry, onDeleteEntry }) {
  const [formData, setFormData] = useState({
    competitor: '',
    title: '',
    url: '',
    notes: '',
  });
  const [showForm, setShowForm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.competitor.trim() || !formData.title.trim()) return;

    onAddEntry({
      ...formData,
      createdAt: new Date().toISOString(),
    });

    setFormData({ competitor: '', title: '', url: '', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="competitor-log">
      <div className="page-header">
        <h1>Competitor Log</h1>
        <p>Track and analyze competitor content</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Log Entries</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
            <div className="form-group">
              <label htmlFor="competitor">Competitor Name</label>
              <input
                type="text"
                id="competitor"
                name="competitor"
                value={formData.competitor}
                onChange={handleChange}
                placeholder="e.g., TruGreen, Sunday Lawn Care"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="title">Content Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Title of the article or content"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="url">URL (optional)</label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Key takeaways, content strategy observations, etc."
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Save Entry
            </button>
          </form>
        )}

        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No entries yet</h3>
            <p>Start logging competitor content to track their strategies</p>
          </div>
        ) : (
          <div className="entries-list">
            {entries.slice().reverse().map((entry) => (
              <div key={entry.id} className="competitor-entry">
                <div className="competitor-entry-header">
                  <div>
                    <h3>{entry.title}</h3>
                    <p style={{ color: '#4caf50', fontWeight: 500, fontSize: '13px' }}>
                      {entry.competitor}
                    </p>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => onDeleteEntry(entry.id)}
                  >
                    Delete
                  </button>
                </div>
                {entry.notes && <p>{entry.notes}</p>}
                {entry.url && (
                  <a href={entry.url} target="_blank" rel="noopener noreferrer">
                    View Content →
                  </a>
                )}
                <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  Added {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CompetitorLog;
