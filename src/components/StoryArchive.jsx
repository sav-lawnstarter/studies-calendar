import React, { useState } from 'react';

// Story Archive with expanded metrics tracking
export default function StoryArchive({ stories, setStories }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [formData, setFormData] = useState({
    title: '',
    publishDate: '',
    url: '',
    // Expanded metrics
    linkCount: '',
    pageviews: '',
    ctr: '',
    domainAuthority: '',
    googleImpressions: '',
    googlePosition: '',
    feedbackNotes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    if (editingId) {
      setStories(stories.map(story =>
        story.id === editingId ? { ...story, ...formData } : story
      ));
      setEditingId(null);
    } else {
      const newStory = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      setStories([...stories, newStory]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      publishDate: '',
      url: '',
      linkCount: '',
      pageviews: '',
      ctr: '',
      domainAuthority: '',
      googleImpressions: '',
      googlePosition: '',
      feedbackNotes: ''
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (story) => {
    setFormData({
      title: story.title,
      publishDate: story.publishDate || '',
      url: story.url || '',
      linkCount: story.linkCount || '',
      pageviews: story.pageviews || '',
      ctr: story.ctr || '',
      domainAuthority: story.domainAuthority || '',
      googleImpressions: story.googleImpressions || '',
      googlePosition: story.googlePosition || '',
      feedbackNotes: story.feedbackNotes || ''
    });
    setEditingId(story.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setStories(stories.filter(story => story.id !== id));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatNumber = (num) => {
    if (!num) return '-';
    return Number(num).toLocaleString();
  };

  const formatPercent = (value) => {
    if (!value) return '-';
    return `${value}%`;
  };

  return (
    <div className="story-archive">
      <div className="section-header">
        <h2>Story Archive</h2>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn-small ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`btn btn-small ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Cards
            </button>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : '+ Add Story'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="story-form">
          <div className="form-section">
            <h4>Basic Info</h4>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="title">Story Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Story title"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="publishDate">Publish Date</label>
                <input
                  type="date"
                  id="publishDate"
                  name="publishDate"
                  value={formData.publishDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="url">URL</label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Performance Metrics</h4>
            <div className="form-grid metrics-grid">
              <div className="form-group">
                <label htmlFor="linkCount">Link Count</label>
                <input
                  type="number"
                  id="linkCount"
                  name="linkCount"
                  value={formData.linkCount}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="pageviews">GA Pageviews</label>
                <input
                  type="number"
                  id="pageviews"
                  name="pageviews"
                  value={formData.pageviews}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ctr">CTR (%)</label>
                <input
                  type="number"
                  id="ctr"
                  name="ctr"
                  value={formData.ctr}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="domainAuthority">Domain Authority</label>
                <input
                  type="number"
                  id="domainAuthority"
                  name="domainAuthority"
                  value={formData.domainAuthority}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="googleImpressions">Google Impressions</label>
                <input
                  type="number"
                  id="googleImpressions"
                  name="googleImpressions"
                  value={formData.googleImpressions}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="googlePosition">Google Position</label>
                <input
                  type="number"
                  id="googlePosition"
                  name="googlePosition"
                  value={formData.googlePosition}
                  onChange={handleInputChange}
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Feedback</h4>
            <div className="form-group full-width">
              <label htmlFor="feedbackNotes">Feedback Notes</label>
              <textarea
                id="feedbackNotes"
                name="feedbackNotes"
                value={formData.feedbackNotes}
                onChange={handleInputChange}
                placeholder="Notes on story performance, pickup quality, etc."
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update' : 'Add'} Story
            </button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {stories.length > 0 ? (
        viewMode === 'table' ? (
          <div className="story-table-container">
            <table className="story-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Publish Date</th>
                  <th>Links</th>
                  <th>Pageviews</th>
                  <th>CTR</th>
                  <th>DA</th>
                  <th>Impressions</th>
                  <th>Position</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories
                  .sort((a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0))
                  .map(story => (
                    <tr key={story.id}>
                      <td className="story-title">
                        {story.url ? (
                          <a href={story.url} target="_blank" rel="noopener noreferrer">
                            {story.title}
                          </a>
                        ) : (
                          story.title
                        )}
                      </td>
                      <td>{formatDate(story.publishDate)}</td>
                      <td className="metric">{formatNumber(story.linkCount)}</td>
                      <td className="metric">{formatNumber(story.pageviews)}</td>
                      <td className="metric">{formatPercent(story.ctr)}</td>
                      <td className="metric">{story.domainAuthority || '-'}</td>
                      <td className="metric">{formatNumber(story.googleImpressions)}</td>
                      <td className="metric">{story.googlePosition || '-'}</td>
                      <td className="actions">
                        <button
                          onClick={() => handleEdit(story)}
                          className="btn btn-small btn-secondary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(story.id)}
                          className="btn btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="story-cards">
            {stories
              .sort((a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0))
              .map(story => (
                <div key={story.id} className="story-card">
                  <div className="card-header">
                    <h3>
                      {story.url ? (
                        <a href={story.url} target="_blank" rel="noopener noreferrer">
                          {story.title}
                        </a>
                      ) : (
                        story.title
                      )}
                    </h3>
                    <span className="publish-date">{formatDate(story.publishDate)}</span>
                  </div>

                  <div className="metrics-grid-display">
                    <div className="metric-item">
                      <span className="metric-label">Links</span>
                      <span className="metric-value">{formatNumber(story.linkCount)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Pageviews</span>
                      <span className="metric-value">{formatNumber(story.pageviews)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">CTR</span>
                      <span className="metric-value">{formatPercent(story.ctr)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Domain Authority</span>
                      <span className="metric-value">{story.domainAuthority || '-'}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Impressions</span>
                      <span className="metric-value">{formatNumber(story.googleImpressions)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Position</span>
                      <span className="metric-value">{story.googlePosition || '-'}</span>
                    </div>
                  </div>

                  {story.feedbackNotes && (
                    <div className="feedback-section">
                      <span className="feedback-label">Feedback:</span>
                      <p>{story.feedbackNotes}</p>
                    </div>
                  )}

                  <div className="card-actions">
                    <button
                      onClick={() => handleEdit(story)}
                      className="btn btn-small btn-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(story.id)}
                      className="btn btn-small btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )
      ) : (
        <p className="empty-state">No stories in archive. Add your first story above.</p>
      )}
    </div>
  );
}
