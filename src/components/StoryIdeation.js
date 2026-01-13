import React, { useState } from 'react';

function StoryIdeation({ ideas, onAddIdea }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    metrics: '',
    newsPeg: '',
  });
  const [rating, setRating] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateRating = () => {
    // SEO Potential scoring (1-5)
    // Based on: keyword specificity, search intent clarity, niche relevance
    let seoScore = 1;
    const titleWords = formData.title.toLowerCase().split(' ');
    const descWords = formData.description.toLowerCase();

    // Check for lawn/garden related keywords (high search volume topics)
    const highVolumeKeywords = ['lawn', 'grass', 'mowing', 'landscaping', 'garden', 'yard', 'tree', 'fertilizer', 'weed', 'pest', 'irrigation', 'sprinkler'];
    const mediumVolumeKeywords = ['mulch', 'edging', 'trimming', 'seeding', 'sod', 'aeration', 'dethatching', 'hedge', 'shrub', 'planting'];

    const hasHighVolume = highVolumeKeywords.some(kw => titleWords.includes(kw) || descWords.includes(kw));
    const hasMediumVolume = mediumVolumeKeywords.some(kw => titleWords.includes(kw) || descWords.includes(kw));

    if (hasHighVolume) seoScore += 2;
    if (hasMediumVolume) seoScore += 1;
    if (formData.metrics.trim().length > 20) seoScore += 1;
    if (formData.title.length > 10 && formData.title.length < 70) seoScore += 0.5;

    seoScore = Math.min(5, Math.round(seoScore));

    // Timeliness scoring (1-5)
    // Based on: seasonal relevance, news peg strength, current events connection
    let timelinessScore = 1;
    const newsPegLower = formData.newsPeg.toLowerCase();
    const descLower = formData.description.toLowerCase();

    // Seasonal keywords
    const seasonalKeywords = ['spring', 'summer', 'fall', 'autumn', 'winter', 'season', 'holiday', 'memorial day', 'labor day', '4th of july', 'thanksgiving'];
    const newsKeywords = ['breaking', 'new study', 'recent', 'latest', 'trending', 'viral', '2024', '2025', '2026', 'update', 'announced'];
    const eventKeywords = ['drought', 'climate', 'weather', 'storm', 'heat wave', 'cold snap', 'legislation', 'ban', 'regulation'];

    const hasSeasonal = seasonalKeywords.some(kw => newsPegLower.includes(kw) || descLower.includes(kw));
    const hasNews = newsKeywords.some(kw => newsPegLower.includes(kw) || descLower.includes(kw));
    const hasEvent = eventKeywords.some(kw => newsPegLower.includes(kw) || descLower.includes(kw));

    if (hasSeasonal) timelinessScore += 1.5;
    if (hasNews) timelinessScore += 1.5;
    if (hasEvent) timelinessScore += 1;
    if (formData.newsPeg.trim().length > 30) timelinessScore += 0.5;

    timelinessScore = Math.min(5, Math.round(timelinessScore));

    const totalScore = seoScore + timelinessScore;

    return {
      seoScore,
      timelinessScore,
      totalScore,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const scores = calculateRating();
    setRating(scores);
  };

  const handleSave = () => {
    if (!rating) return;

    const newIdea = {
      ...formData,
      ...rating,
      createdAt: new Date().toISOString(),
    };

    onAddIdea(newIdea);
    setFormData({ title: '', description: '', metrics: '', newsPeg: '' });
    setRating(null);
  };

  const renderStars = (score) => {
    return '★'.repeat(score) + '☆'.repeat(5 - score);
  };

  return (
    <div className="story-ideation">
      <div className="page-header">
        <h1>Story Ideation</h1>
        <p>Submit story ideas and get instant SEO and timeliness ratings</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>New Story Idea</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Story Idea / Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter your story idea or working title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Brief Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the story angle, key points, and target audience"
            />
          </div>

          <div className="form-group">
            <label htmlFor="metrics">Potential Metrics or Data Sources</label>
            <textarea
              id="metrics"
              name="metrics"
              value={formData.metrics}
              onChange={handleChange}
              placeholder="List any data sources, studies, or metrics you plan to use"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newsPeg">News Peg or Timely Hook</label>
            <textarea
              id="newsPeg"
              name="newsPeg"
              value={formData.newsPeg}
              onChange={handleChange}
              placeholder="What makes this story timely? (e.g., seasonal relevance, recent news, upcoming events)"
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Rate This Idea
          </button>
        </form>

        {rating && (
          <div className="idea-rating">
            <h3>Idea Rating</h3>

            <div className="rating-item">
              <span className="rating-label">SEO Potential</span>
              <div className="rating-score">
                <span className="stars">{renderStars(rating.seoScore)}</span>
                <span className="score-number">{rating.seoScore}/5</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px', marginTop: '-8px' }}>
              Keyword opportunity based on likely search volume
            </p>

            <div className="rating-item">
              <span className="rating-label">Timeliness</span>
              <div className="rating-score">
                <span className="stars">{renderStars(rating.timelinessScore)}</span>
                <span className="score-number">{rating.timelinessScore}/5</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px', marginTop: '-8px' }}>
              Connection to upcoming events, seasons, or news cycles
            </p>

            <div className="total-score">
              <span className="total-score-label">Total Score</span>
              <span className="total-score-value">{rating.totalScore}/10</span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '20px', width: '100%' }}
              onClick={handleSave}
            >
              Save This Idea
            </button>
          </div>
        )}
      </div>

      {ideas.length > 0 && (
        <div className="saved-ideas">
          <h2>Saved Ideas ({ideas.length})</h2>
          {ideas.slice().reverse().map((idea) => (
            <div key={idea.id} className="idea-card">
              <h3>{idea.title}</h3>
              {idea.description && <p>{idea.description}</p>}
              <div className="idea-meta">
                {idea.metrics && <span>📊 Has metrics/data</span>}
                {idea.newsPeg && <span>📰 Has news peg</span>}
                <span>📅 {new Date(idea.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="idea-scores">
                <span className="idea-score-badge">SEO: {idea.seoScore}/5</span>
                <span className="idea-score-badge">Timeliness: {idea.timelinessScore}/5</span>
                <span className="idea-score-badge total">Total: {idea.totalScore}/10</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StoryIdeation;
