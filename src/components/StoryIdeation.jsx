import React, { useState } from 'react';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export default function StoryIdeation() {
  const { ideas, addIdea, deleteIdea } = useAppData();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    metrics: '',
    newsPeg: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    addIdea({
      title: formData.title,
      description: formData.description,
      metrics: formData.metrics,
      newsPeg: formData.newsPeg,
    });

    setFormData({ title: '', description: '', metrics: '', newsPeg: '' });
  };

  const handleDelete = (id) => {
    deleteIdea(id);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb size={28} className="text-ls-green" />
        <h1 className="text-2xl font-bold text-gray-900">Story Ideation</h1>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Idea</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Story Idea / Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter your story idea..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brief Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the story angle or approach..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent resize-none"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
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
              placeholder="e.g., seasonal trend, upcoming event, recent news..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
          >
            <Plus size={18} />
            Add Idea
          </button>
        </form>
      </div>

      {/* Ideas List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Saved Ideas ({ideas.length})
        </h2>

        {ideas.length === 0 ? (
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
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{idea.title}</h3>
                    <span className="text-xs text-gray-400">{idea.createdAt}</span>
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

                <button
                  onClick={() => handleDelete(idea.id)}
                  className="flex items-center gap-2 px-3 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors ml-4"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
