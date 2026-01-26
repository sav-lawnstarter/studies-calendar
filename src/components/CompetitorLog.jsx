import React, { useState } from 'react';
import { Plus, ExternalLink, Search, Calendar, Building2, X, Trash2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

// Add Entry Modal Component
function AddEntryModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    competitor: '',
    activity: '',
    notes: '',
    url: '',
    date: new Date().toISOString().split('T')[0],
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.competitor.trim() || !formData.activity.trim()) return;

    onSave(formData);
    setFormData({
      competitor: '',
      activity: '',
      notes: '',
      url: '',
      date: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b bg-ls-green text-white rounded-t-xl">
          <h3 className="text-lg font-semibold">Add Competitor Entry</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Competitor *
            </label>
            <input
              type="text"
              name="competitor"
              value={formData.competitor}
              onChange={handleInputChange}
              placeholder="e.g., TruGreen, Scotts"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity *
            </label>
            <input
              type="text"
              name="activity"
              value={formData.activity}
              onChange={handleInputChange}
              placeholder="What did they do?"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional details..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL (optional)
            </label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
            >
              Add Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompetitorLog() {
  const { competitors, addCompetitor, deleteCompetitor } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredLogs = competitors.filter(
    (log) =>
      log.competitor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.activity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate dynamic stats from actual data
  const competitorCounts = competitors.reduce((acc, log) => {
    if (log.competitor) {
      acc[log.competitor] = (acc[log.competitor] || 0) + 1;
    }
    return acc;
  }, {});

  const topCompetitors = Object.entries(competitorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const handleAddEntry = (entryData) => {
    addCompetitor(entryData);
  };

  const handleDelete = (id) => {
    deleteCompetitor(id);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Competitor Log</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent w-64"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
          >
            <Plus size={18} />
            Add Entry
          </button>
        </div>
      </div>

      {/* Log Cards */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-ls-green-lighter rounded-full">
                    <Building2 size={14} className="text-ls-green" />
                    <span className="text-sm font-medium text-ls-green">{log.competitor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar size={14} />
                    {log.date}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{log.activity}</h3>
                {log.notes && <p className="text-gray-600">{log.notes}</p>}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {log.url && (
                  <a
                    href={log.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={16} />
                    View
                  </a>
                )}
                <button
                  onClick={() => handleDelete(log.id)}
                  className="p-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete entry"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {competitors.length === 0
                ? 'No competitor activities logged yet. Add your first entry!'
                : 'No competitor activities found matching your search.'}
            </p>
          </div>
        )}
      </div>

      {/* Competitor Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Competitors</h3>
          <div className="space-y-3">
            {topCompetitors.length > 0 ? (
              topCompetitors.map(([competitor, count], index) => (
                <div key={competitor} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-ls-green-lighter rounded-full flex items-center justify-center text-xs font-medium text-ls-green">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{competitor}</span>
                  </div>
                  <span className="text-sm text-gray-500">{count} activities</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">
                No competitor data yet
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Entries</span>
              <span className="font-medium text-gray-900">{competitors.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Unique Competitors</span>
              <span className="font-medium text-gray-900">{Object.keys(competitorCounts).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">This Month</span>
              <span className="font-medium text-gray-900">
                {competitors.filter((c) => {
                  if (!c.date) return false;
                  const entryDate = new Date(c.date);
                  const now = new Date();
                  return (
                    entryDate.getMonth() === now.getMonth() &&
                    entryDate.getFullYear() === now.getFullYear()
                  );
                }).length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trends</h3>
          <p className="text-gray-600 text-sm">
            {competitors.length > 0
              ? 'Track competitor activities to identify trends and opportunities for your content strategy.'
              : 'Start logging competitor activities to build insights over time.'}
          </p>
        </div>
      </div>

      {/* Add Entry Modal */}
      <AddEntryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddEntry}
      />
    </div>
  );
}
