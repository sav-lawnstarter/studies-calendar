import React, { useState } from 'react';
import { Search, ChevronDown, Eye, Edit2, X, Save, Building2 } from 'lucide-react';

const BRANDS = ['LawnStarter', 'Lawn Love', 'Home Gnome'];
const STATUSES = ['Pitched', 'In Progress', 'Published'];

export default function StoryArchive({ stories = [], updateStory, deleteStory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [selectedStory, setSelectedStory] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);

  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (story.assignee && story.assignee.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || story.status === statusFilter;
    const matchesBrand = brandFilter === 'All' || story.brand === brandFilter;
    return matchesSearch && matchesStatus && matchesBrand;
  });

  const getStatusBadge = (status) => {
    const styles = {
      Published: 'bg-ls-green text-white',
      'In Progress': 'bg-ls-orange text-white',
      Pitched: 'bg-ls-blue text-white',
    };
    return styles[status] || 'bg-gray-300 text-gray-700';
  };

  const getBrandBadge = (brand) => {
    const styles = {
      'LawnStarter': 'bg-ls-green-lighter text-ls-green border border-ls-green',
      'Lawn Love': 'bg-pink-100 text-pink-600 border border-pink-300',
      'Home Gnome': 'bg-purple-100 text-purple-600 border border-purple-300',
    };
    return styles[brand] || 'bg-gray-100 text-gray-600 border border-gray-300';
  };

  const handleViewStory = (story) => {
    setSelectedStory(story);
    setEditMode(false);
    setEditData(null);
  };

  const handleEditStory = (story) => {
    setSelectedStory(story);
    setEditMode(true);
    setEditData({
      ...story,
      metrics: {
        linkCount: story.metrics?.linkCount || '',
        ctr: story.metrics?.ctr || '',
        googleImpressions: story.metrics?.googleImpressions || '',
        googlePosition: story.metrics?.googlePosition || '',
        domainAuthority: story.metrics?.domainAuthority || '',
        pageviews: story.metrics?.pageviews || '',
        ...story.metrics,
      },
      feedbackNotes: story.feedbackNotes || '',
    });
  };

  const handleSaveChanges = () => {
    if (!editData) return;

    updateStory(editData.id, {
      title: editData.title,
      brand: editData.brand,
      status: editData.status,
      pitchDate: editData.pitchDate,
      publishDate: editData.publishDate,
      assignee: editData.assignee,
      metrics: {
        ...editData.metrics,
        linkCount: editData.metrics.linkCount || null,
        ctr: editData.metrics.ctr || null,
        googleImpressions: editData.metrics.googleImpressions || null,
        googlePosition: editData.metrics.googlePosition || null,
        domainAuthority: editData.metrics.domainAuthority || null,
        pageviews: editData.metrics.pageviews || null,
      },
      feedbackNotes: editData.feedbackNotes,
    });

    setSelectedStory(null);
    setEditMode(false);
    setEditData(null);
  };

  const closeModal = () => {
    setSelectedStory(null);
    setEditMode(false);
    setEditData(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Story Archive</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent w-64"
            />
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Brands</option>
              {BRANDS.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Status</option>
              {STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stories Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Title</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Brand</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Pitch Date</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Pageviews</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Link Count</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStories.map((story) => (
              <tr key={story.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEditStory(story)}
                    className="text-left hover:text-ls-green transition-colors"
                  >
                    <p className="font-medium text-gray-900 hover:text-ls-green">{story.title}</p>
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getBrandBadge(story.brand)}`}>
                    {story.brand || 'Unassigned'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{story.pitchDate || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(story.status)}`}>
                    {story.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {story.metrics?.pageviews || '-'}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {story.metrics?.linkCount || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleViewStory(story)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleEditStory(story)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit & Add Metrics"
                    >
                      <Edit2 size={16} className="text-ls-green" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No stories found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Story Detail/Edit Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-ls-green p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(editMode ? editData?.status : selectedStory.status)}`}>
                      {editMode ? editData?.status : selectedStory.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBrandBadge(editMode ? editData?.brand : selectedStory.brand)}`}>
                      <Building2 size={12} className="inline mr-1" />
                      {editMode ? editData?.brand || 'Unassigned' : selectedStory.brand || 'Unassigned'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold">
                    {editMode ? editData?.title : selectedStory.title}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {editMode && editData ? (
                /* Edit Mode */
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                      <select
                        value={editData.brand || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      >
                        <option value="">Select Brand</option>
                        {BRANDS.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editData.status}
                        onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      >
                        {STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                      <input
                        type="text"
                        value={editData.assignee || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, assignee: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pitch Date</label>
                      <input
                        type="date"
                        value={editData.pitchDate || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, pitchDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Publish Date</label>
                      <input
                        type="date"
                        value={editData.publishDate || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, publishDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Metrics Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link Count</label>
                        <input
                          type="number"
                          value={editData.metrics?.linkCount || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, linkCount: e.target.value }
                          }))}
                          placeholder="Enter link count"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTR (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editData.metrics?.ctr || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, ctr: e.target.value }
                          }))}
                          placeholder="Enter CTR"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Impressions</label>
                        <input
                          type="number"
                          value={editData.metrics?.googleImpressions || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, googleImpressions: e.target.value }
                          }))}
                          placeholder="Enter impressions"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Position</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editData.metrics?.googlePosition || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, googlePosition: e.target.value }
                          }))}
                          placeholder="Enter position"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Domain Authority</label>
                        <input
                          type="number"
                          value={editData.metrics?.domainAuthority || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, domainAuthority: e.target.value }
                          }))}
                          placeholder="Enter DA"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pageviews</label>
                        <input
                          type="number"
                          value={editData.metrics?.pageviews || ''}
                          onChange={(e) => setEditData(prev => ({
                            ...prev,
                            metrics: { ...prev.metrics, pageviews: e.target.value }
                          }))}
                          placeholder="Enter pageviews"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feedback Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feedback Notes</label>
                    <textarea
                      value={editData.feedbackNotes || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, feedbackNotes: e.target.value }))}
                      rows={4}
                      placeholder="Add feedback or notes about this story..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-6">
                  {/* Key Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-sm mb-1">Assignee</p>
                      <p className="font-semibold text-gray-900">{selectedStory.assignee || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-sm mb-1">Pitch Date</p>
                      <p className="font-semibold text-gray-900">{selectedStory.pitchDate || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-sm mb-1">Publish Date</p>
                      <p className="font-semibold text-gray-900">{selectedStory.publishDate || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-sm mb-1">Brand</p>
                      <p className="font-semibold text-gray-900">{selectedStory.brand || '-'}</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedStory.metrics?.linkCount || '-'}</p>
                        <p className="text-sm text-gray-500">Link Count</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedStory.metrics?.ctr ? `${selectedStory.metrics.ctr}%` : '-'}</p>
                        <p className="text-sm text-gray-500">CTR</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedStory.metrics?.googleImpressions?.toLocaleString() || '-'}</p>
                        <p className="text-sm text-gray-500">Google Impressions</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedStory.metrics?.googlePosition || '-'}</p>
                        <p className="text-sm text-gray-500">Google Position</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedStory.metrics?.domainAuthority || '-'}</p>
                        <p className="text-sm text-gray-500">Domain Authority</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{selectedStory.metrics?.pageviews?.toLocaleString() || '-'}</p>
                        <p className="text-sm text-gray-500">Pageviews</p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Notes */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Feedback Notes</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-gray-700">{selectedStory.feedbackNotes || 'No feedback notes added yet.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {editMode ? 'Cancel' : 'Close'}
              </button>
              {editMode ? (
                <button
                  onClick={handleSaveChanges}
                  className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              ) : (
                <button
                  onClick={() => handleEditStory(selectedStory)}
                  className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
                >
                  <Edit2 size={16} />
                  Edit Story
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
