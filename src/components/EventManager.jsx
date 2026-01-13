import React, { useState } from 'react';

// Event Manager for adding custom events with blocked/noted toggle
export default function EventManager({ customEvents, setCustomEvents }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    category: '',
    type: 'high_traffic', // 'blocked' or 'high_traffic'
    notes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.date) {
      return;
    }

    if (editingId) {
      setCustomEvents(customEvents.map(event =>
        event.id === editingId ? { ...event, ...formData } : event
      ));
      setEditingId(null);
    } else {
      const newEvent = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      setCustomEvents([...customEvents, newEvent]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      category: '',
      type: 'high_traffic',
      notes: ''
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (event) => {
    setFormData({
      name: event.name,
      date: event.date,
      category: event.category || '',
      type: event.type,
      notes: event.notes || ''
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setCustomEvents(customEvents.filter(event => event.id !== id));
  };

  const handleToggleType = (id) => {
    setCustomEvents(customEvents.map(event =>
      event.id === id
        ? { ...event, type: event.type === 'blocked' ? 'high_traffic' : 'blocked' }
        : event
    ));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="event-manager">
      <div className="section-header">
        <h2>Custom Events</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="event-name">Event Name</label>
              <input
                type="text"
                id="event-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Event name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="event-date">Date</label>
              <input
                type="date"
                id="event-date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="event-category">Category</label>
              <input
                type="text"
                id="event-category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Sports, Awards, Cultural"
              />
            </div>

            <div className="form-group">
              <label htmlFor="event-type">Event Type</label>
              <select
                id="event-type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
              >
                <option value="high_traffic">📺 High Traffic (Noted)</option>
                <option value="blocked">🚫 Blocked</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="event-notes">Notes</label>
              <textarea
                id="event-notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes..."
                rows="2"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update' : 'Add'} Event
            </button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {customEvents.length > 0 ? (
        <div className="events-list">
          <table className="events-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Category</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customEvents
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(event => (
                  <tr key={event.id} className={event.type === 'blocked' ? 'blocked-row' : ''}>
                    <td>{event.name}</td>
                    <td>{formatDate(event.date)}</td>
                    <td>{event.category || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleToggleType(event.id)}
                        className={`type-toggle ${event.type}`}
                        title="Click to toggle type"
                      >
                        {event.type === 'blocked' ? '🚫 Blocked' : '📺 High Traffic'}
                      </button>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => handleEdit(event)}
                        className="btn btn-small btn-secondary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
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
        <p className="empty-state">No custom events added. Add your first event above.</p>
      )}
    </div>
  );
}
