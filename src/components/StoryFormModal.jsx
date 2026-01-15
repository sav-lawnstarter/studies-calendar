import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BRANDS = ['LawnStarter', 'Lawn Love', 'Home Gnome'];

const initialFormState = {
  title: '',
  brand: 'LawnStarter',
  pitchDate: '',
  newsPeg: '',
  analysisDueBy: '',
  draftDueBy: '',
  editsDueBy: '',
  qaDueBy: '',
  productionDate: '',
  expertsContacted: '',
  notes: '',
  urls: {
    research: '',
    methodology: '',
    officialAnalysis: '',
    publishedStory: '',
  },
};

export default function StoryFormModal({ story, onSave, onClose }) {
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (story) {
      setFormData({
        title: story.title || '',
        brand: story.brand || 'LawnStarter',
        pitchDate: story.pitchDate || '',
        newsPeg: story.newsPeg || '',
        analysisDueBy: story.analysisDueBy || '',
        draftDueBy: story.draftDueBy || '',
        editsDueBy: story.editsDueBy || '',
        qaDueBy: story.qaDueBy || '',
        productionDate: story.productionDate || '',
        expertsContacted: story.expertsContacted || '',
        notes: story.notes || '',
        urls: {
          research: story.urls?.research || '',
          methodology: story.urls?.methodology || '',
          officialAnalysis: story.urls?.officialAnalysis || '',
          publishedStory: story.urls?.publishedStory || '',
        },
      });
    } else {
      setFormData(initialFormState);
    }
  }, [story]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('url_')) {
      const urlKey = name.replace('url_', '');
      setFormData((prev) => ({
        ...prev,
        urls: { ...prev.urls, [urlKey]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Story title is required');
      return;
    }
    if (!formData.pitchDate) {
      alert('Pitch Date is required');
      return;
    }
    onSave({
      ...formData,
      id: story?.id || `story-${Date.now()}`,
    });
  };

  const isEditing = !!story;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-ls-green p-4 text-white flex items-center justify-between">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Story' : 'Add New Story'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Story Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Story Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="Enter story title"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
              >
                {BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Pitch Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pitch Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="pitchDate"
                value={formData.pitchDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
              />
            </div>

            {/* News Peg/Holiday tie-in */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                News Peg/Holiday Tie-in
              </label>
              <input
                type="text"
                name="newsPeg"
                value={formData.newsPeg}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., Labor Day, Spring Home Improvement Season"
              />
            </div>

            {/* Due Dates Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Analysis Due By
                </label>
                <input
                  type="date"
                  name="analysisDueBy"
                  value={formData.analysisDueBy}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Draft Due By
                </label>
                <input
                  type="date"
                  name="draftDueBy"
                  value={formData.draftDueBy}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                />
              </div>
            </div>

            {/* Due Dates Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Edits Due By
                </label>
                <input
                  type="date"
                  name="editsDueBy"
                  value={formData.editsDueBy}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QA Due By</label>
                <input
                  type="date"
                  name="qaDueBy"
                  value={formData.qaDueBy}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                />
              </div>
            </div>

            {/* Production Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Production Date
              </label>
              <input
                type="date"
                name="productionDate"
                value={formData.productionDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
              />
            </div>

            {/* Number of Experts Contacted */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Experts Contacted
              </label>
              <input
                type="number"
                name="expertsContacted"
                value={formData.expertsContacted}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="0"
              />
            </div>

            {/* Notes/Blockers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes/Blockers
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent resize-none"
                placeholder="Add any notes or blockers..."
              />
            </div>

            {/* URLs Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">URLs</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Research</label>
                  <input
                    type="url"
                    name="url_research"
                    value={formData.urls.research}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Methodology
                  </label>
                  <input
                    type="url"
                    name="url_methodology"
                    value={formData.urls.methodology}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Official Analysis
                  </label>
                  <input
                    type="url"
                    name="url_officialAnalysis"
                    value={formData.urls.officialAnalysis}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Published Story
                  </label>
                  <input
                    type="url"
                    name="url_publishedStory"
                    value={formData.urls.publishedStory}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Add Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
