import React, { useState } from 'react';
import { X } from 'lucide-react';

const initialFormData = {
  title: '',
  date: '',
  endDate: '',
  type: 'blocked',
  reason: '',
};

export default function BlockDateModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(initialFormData);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    onSave({
      title: formData.title,
      date: formData.date,
      endDate: formData.endDate || undefined,
      type: formData.type,
      reason: formData.reason,
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Block Date</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title / Description *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Team Meeting, No Publishing"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="blocked"
                  checked={formData.type === 'blocked'}
                  onChange={handleInputChange}
                  className="text-ls-orange focus:ring-ls-orange"
                />
                <span className="px-3 py-1 rounded-full text-sm bg-ls-orange-light text-ls-orange border border-ls-orange">
                  Blocked
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="highTraffic"
                  checked={formData.type === 'highTraffic'}
                  onChange={handleInputChange}
                  className="text-ls-blue focus:ring-ls-blue"
                />
                <span className="px-3 py-1 rounded-full text-sm bg-ls-blue text-white">
                  High Traffic
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (optional)
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.date}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Why is this date blocked?"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent resize-none"
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
              className="px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright transition-colors"
            >
              Block Date
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
