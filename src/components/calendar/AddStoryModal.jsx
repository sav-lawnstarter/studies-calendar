import React, { useState } from 'react';
import { X } from 'lucide-react';

const initialFormData = {
  title: '',
  assignee: '',
  priority: 'Medium',
  status: 'Planned',
  dueDate: '',
  publishDate: '',
  targetWords: 1500,
  notes: '',
};

export default function AddStoryModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(initialFormData);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.publishDate) return;

    onSave({
      ...formData,
      targetWords: parseInt(formData.targetWords, 10) || 1500,
      metrics: {
        currentWords: 0,
        targetWords: parseInt(formData.targetWords, 10) || 1500,
      },
    });

    setFormData(initialFormData);
    onClose();
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-ls-green text-white rounded-t-xl">
          <h3 className="text-lg font-semibold">Add New Story</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Story Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter story title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <input
                type="text"
                name="assignee"
                value={formData.assignee}
                onChange={handleInputChange}
                placeholder="Who's writing this?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              >
                <option value="Planned">Planned</option>
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Published">Published</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Words
              </label>
              <input
                type="number"
                name="targetWords"
                value={formData.targetWords}
                onChange={handleInputChange}
                min="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publish Date *
              </label>
              <input
                type="date"
                name="publishDate"
                value={formData.publishDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any notes about this story..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
            >
              Add Story
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
