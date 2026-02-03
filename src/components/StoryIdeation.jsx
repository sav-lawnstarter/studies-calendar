import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Lightbulb, RefreshCw, Loader2, Edit3, X, Calendar, AlertCircle } from 'lucide-react';
import {
  getStoredToken,
  loadGoogleScript,
  authenticateWithGoogle,
  fetchStoryIdeationData,
  appendStoryIdeation,
  updateStoryIdeation,
  deleteStoryIdeation,
} from '../utils/googleSheets';

export default function StoryIdeation() {
  // Ideas state from Google Sheets
  const [ideas, setIdeas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    metrics: '',
    newsPeg: '',
    pitchDate: '',
  });

  // Edit modal state
  const [editingIdea, setEditingIdea] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Fetch ideas from Google Sheets
  const fetchIdeas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let token = getStoredToken();

      if (!token) {
        if (clientId) {
          await loadGoogleScript();
          token = await authenticateWithGoogle(clientId);
        } else {
          throw new Error('Google Client ID not configured');
        }
      }

      const data = await fetchStoryIdeationData(token);
      setIdeas(data);
    } catch (err) {
      console.error('Error fetching story ideation:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // Load ideas on mount
  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('Not authenticated. Please refresh the page.');
      }

      const newEntry = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        metrics: formData.metrics.trim(),
        newsPeg: formData.newsPeg.trim(),
        pitchDate: formData.pitchDate,
        dateAdded: new Date().toISOString().split('T')[0],
      };

      await appendStoryIdeation(token, newEntry);

      // Clear form and refresh data
      setFormData({ title: '', description: '', metrics: '', newsPeg: '', pitchDate: '' });
      await fetchIdeas();
    } catch (err) {
      console.error('Error adding story ideation:', err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (idea) => {
    if (!window.confirm('Are you sure you want to delete this story idea?')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('Not authenticated. Please refresh the page.');
      }

      await deleteStoryIdeation(token, idea.rowIndex);
      await fetchIdeas();
    } catch (err) {
      console.error('Error deleting story ideation:', err);
      setError(`Failed to delete: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingIdea) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('Not authenticated. Please refresh the page.');
      }

      await updateStoryIdeation(token, editingIdea.rowIndex, editingIdea);
      setShowEditModal(false);
      setEditingIdea(null);
      await fetchIdeas();
    } catch (err) {
      console.error('Error updating story ideation:', err);
      setError(`Failed to update: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (idea) => {
    setEditingIdea({ ...idea });
    setShowEditModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Edit Modal Component
  const EditModal = () => {
    if (!showEditModal || !editingIdea) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={() => setShowEditModal(false)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-yellow-50">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Story Idea</h3>
              <p className="text-xs text-gray-500">Update your story idea details</p>
            </div>
            <button
              onClick={() => setShowEditModal(false)}
              className="p-1 hover:bg-yellow-100 rounded-lg"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Story Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingIdea.title}
                onChange={(e) => setEditingIdea({ ...editingIdea, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brief Description
              </label>
              <textarea
                value={editingIdea.description}
                onChange={(e) => setEditingIdea({ ...editingIdea, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Potential Metrics or Data Sources
              </label>
              <input
                type="text"
                value={editingIdea.metrics}
                onChange={(e) => setEditingIdea({ ...editingIdea, metrics: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                News Peg or Timely Hook
              </label>
              <input
                type="text"
                value={editingIdea.newsPeg}
                onChange={(e) => setEditingIdea({ ...editingIdea, newsPeg: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pitch Date
              </label>
              <input
                type="date"
                value={editingIdea.pitchDate}
                onChange={(e) => setEditingIdea({ ...editingIdea, pitchDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-yellow-50 rounded-b-xl flex gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={!editingIdea.title.trim() || isSaving}
              className="flex-1 px-4 py-2 bg-yellow-400 text-yellow-900 font-medium rounded-lg hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb size={28} className="text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Story Ideation</h1>
            <p className="text-sm text-gray-500">Ideas with a Pitch Date appear on the calendar in yellow</p>
          </div>
        </div>
        <button
          onClick={fetchIdeas}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Refresh from Google Sheets"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Idea</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Story Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter your story idea..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brief Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the story angle or approach..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Potential Metrics or Data Sources
              </label>
              <input
                type="text"
                name="metrics"
                value={formData.metrics}
                onChange={handleInputChange}
                placeholder="e.g., Google Trends, internal data, surveys..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                News Peg or Timely Hook
              </label>
              <input
                type="text"
                name="newsPeg"
                value={formData.newsPeg}
                onChange={handleInputChange}
                placeholder="e.g., seasonal trend, upcoming event..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pitch Date
              </label>
              <input
                type="date"
                name="pitchDate"
                value={formData.pitchDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set a pitch date to show this idea on the calendar
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving || !formData.title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            Add Idea
          </button>
        </form>
      </div>

      {/* Ideas List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Saved Ideas ({ideas.length})
        </h2>

        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Loader2 size={48} className="mx-auto text-yellow-400 mb-3 animate-spin" />
            <p className="text-gray-500">Loading ideas from Google Sheets...</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Lightbulb size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No ideas yet. Add your first story idea above!</p>
          </div>
        ) : (
          ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">{idea.title}</h3>
                    {idea.pitchDate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        <Calendar size={12} />
                        Pitch: {formatDate(idea.pitchDate)}
                      </span>
                    )}
                    {idea.dateAdded && (
                      <span className="text-xs text-gray-400">Added {formatDate(idea.dateAdded)}</span>
                    )}
                  </div>

                  {idea.description && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-gray-700">{idea.description}</p>
                    </div>
                  )}

                  {idea.metrics && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-500">Metrics / Data Sources</p>
                      <p className="text-gray-700">{idea.metrics}</p>
                    </div>
                  )}

                  {idea.newsPeg && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">News Peg / Timely Hook</p>
                      <p className="text-gray-700">{idea.newsPeg}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openEditModal(idea)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(idea)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      <EditModal />
    </div>
  );
}
