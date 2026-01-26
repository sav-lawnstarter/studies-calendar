import React, { useState } from 'react';
import { Plus, ExternalLink, Search, Link2, Trash2, X, Tag } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

// Add Source Modal Component
function AddSourceModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'Website',
    notes: '',
    tags: '',
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSave({
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setFormData({
      name: '',
      url: '',
      type: 'Website',
      notes: '',
      tags: '',
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
          <h3 className="text-lg font-semibold">Add Source</h3>
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
              Source Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Bureau of Labor Statistics"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="Website">Website</option>
              <option value="Database">Database</option>
              <option value="API">API</option>
              <option value="Publication">Publication</option>
              <option value="Expert">Expert Contact</option>
              <option value="Tool">Tool/Software</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="e.g., lawn care, statistics, government"
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
              placeholder="What kind of data does this source provide?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent resize-none"
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
              Add Source
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sources() {
  const { sources, addSource, deleteSource } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredSources = sources.filter((source) => {
    const matchesSearch =
      source.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'All' || source.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAddSource = (sourceData) => {
    addSource(sourceData);
  };

  const handleDelete = (id) => {
    deleteSource(id);
  };

  const getTypeStyle = (type) => {
    const styles = {
      Website: 'bg-blue-100 text-blue-700',
      Database: 'bg-purple-100 text-purple-700',
      API: 'bg-green-100 text-green-700',
      Publication: 'bg-orange-100 text-orange-700',
      Expert: 'bg-pink-100 text-pink-700',
      Tool: 'bg-cyan-100 text-cyan-700',
      Other: 'bg-gray-100 text-gray-700',
    };
    return styles[type] || styles.Other;
  };

  // Get unique types from sources
  const sourceTypes = ['All', ...new Set(sources.map((s) => s.type).filter(Boolean))];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link2 size={28} className="text-ls-green" />
          <h1 className="text-2xl font-bold text-gray-900">Sources</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent w-64"
            />
          </div>

          {/* Type Filter */}
          {sources.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              {sourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'All' ? 'All Types' : type}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
          >
            <Plus size={18} />
            Add Source
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeStyle(source.type)}`}>
                  {source.type}
                </span>
              </div>
              <button
                onClick={() => handleDelete(source.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete source"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {source.notes && (
              <p className="text-gray-600 text-sm mb-3">{source.notes}</p>
            )}

            {source.tags && source.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {source.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-gray-400">Added {source.addedAt}</span>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-ls-green hover:text-ls-green-light text-sm transition-colors"
                >
                  <ExternalLink size={14} />
                  Visit
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Link2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {sources.length === 0
              ? 'No sources added yet. Add your first data source!'
              : 'No sources found matching your search.'}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {sources.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-3xl font-bold text-ls-green">{sources.length}</p>
            <p className="text-sm text-gray-500">Total Sources</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {sources.filter((s) => s.type === 'Website').length}
            </p>
            <p className="text-sm text-gray-500">Websites</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {sources.filter((s) => s.type === 'Database').length}
            </p>
            <p className="text-sm text-gray-500">Databases</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {sources.filter((s) => s.type === 'API').length}
            </p>
            <p className="text-sm text-gray-500">APIs</p>
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      <AddSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddSource}
      />
    </div>
  );
}
