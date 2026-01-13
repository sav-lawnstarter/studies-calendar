import React, { useState } from 'react';

// Simplified OOO Tracker - just name and dates, no reason required
export default function OOOTracker({ oooEntries, setOooEntries }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim() || !startDate || !endDate) {
      return;
    }

    const newEntry = {
      id: Date.now(),
      name: name.trim(),
      startDate,
      endDate,
      createdAt: new Date().toISOString()
    };

    setOooEntries([...oooEntries, newEntry]);

    // Reset form
    setName('');
    setStartDate('');
    setEndDate('');
  };

  const handleDelete = (id) => {
    setOooEntries(oooEntries.filter(entry => entry.id !== id));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="ooo-tracker">
      <h2>OOO Tracker</h2>

      <form onSubmit={handleSubmit} className="ooo-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ooo-name">Name</label>
            <input
              type="text"
              id="ooo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ooo-start">Start Date</label>
            <input
              type="date"
              id="ooo-start"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ooo-end">End Date</label>
            <input
              type="date"
              id="ooo-end"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Add OOO
          </button>
        </div>
      </form>

      {oooEntries.length > 0 && (
        <div className="ooo-list">
          <h3>Upcoming OOO</h3>
          <table className="ooo-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start</th>
                <th>End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {oooEntries
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .map(entry => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{formatDate(entry.startDate)}</td>
                    <td>{formatDate(entry.endDate)}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="btn btn-small btn-danger"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
