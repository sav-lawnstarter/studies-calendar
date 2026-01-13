import React, { useState } from 'react';

// Content Calendar - without Writer Assigned field
export default function ContentCalendar({ entries, setEntries }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
    status: 'Draft',
    category: '',
    notes: ''
  });

  const statusOptions = ['Draft', 'In Review', 'Approved', 'Published', 'On Hold'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.dueDate) {
      return;
    }

    if (editingId) {
      setEntries(entries.map(entry =>
        entry.id === editingId ? { ...entry, ...formData } : entry
      ));
      setEditingId(null);
    } else {
      const newEntry = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      setEntries([...entries, newEntry]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      dueDate: '',
      status: 'Draft',
      category: '',
      notes: ''
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (entry) => {
    setFormData({
      title: entry.title,
      dueDate: entry.dueDate,
      status: entry.status,
      category: entry.category || '',
      notes: entry.notes || ''
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      'Draft': 'status-draft',
      'In Review': 'status-review',
      'Approved': 'status-approved',
      'Published': 'status-published',
      'On Hold': 'status-hold'
    };
    return statusClasses[status] || '';
  };

  return (
    <div className="content-calendar">
      <div className="section-header">
        <h2>Content Calendar</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Content'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="content-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Content title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g., Blog, Social, PR"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
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
              {editingId ? 'Update' : 'Add'} Content
            </button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {entries.length > 0 ? (
        <div className="content-list">
          <table className="content-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .map(entry => (
                  <tr key={entry.id}>
                    <td className="content-title">{entry.title}</td>
                    <td>{formatDate(entry.dueDate)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>{entry.category || '-'}</td>
                    <td className="actions">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="btn btn-small btn-secondary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
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
        <p className="empty-state">No content scheduled. Add your first piece of content above.</p>
      )}
    </div>
  );
}
