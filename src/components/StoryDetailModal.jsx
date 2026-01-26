import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  User,
  Flag,
  FileText,
  BarChart2,
  CheckCircle2,
  Circle,
  Clock,
  Link2,
  StickyNote,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function StoryDetailModal({ story, onClose, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: story?.title || '',
    author: story?.author || story?.assignee || '',
    publishDate: story?.publishDate || '',
    notes: story?.notes || '',
    wordCount: story?.wordCount || story?.metrics?.currentWords || 0,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!story) return null;

  const isCustomStory = story.id?.startsWith('story-');

  const handleSaveEdit = () => {
    if (onEdit && editData.title) {
      onEdit(story.id, {
        title: editData.title,
        author: editData.author,
        publishDate: editData.publishDate,
        notes: editData.notes,
        wordCount: parseInt(editData.wordCount, 10) || 0,
      });
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(story.id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Published':
        return 'bg-ls-green text-white';
      case 'In Progress':
        return 'bg-ls-orange text-white';
      case 'Draft':
        return 'bg-yellow-500 text-white';
      case 'Planned':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-300 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'text-red-600 bg-red-50';
      case 'Medium':
        return 'text-ls-orange bg-orange-50';
      case 'Low':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const progressPercentage = story.metrics?.currentWords && story.metrics?.targetWords
    ? Math.min(100, Math.round((story.metrics.currentWords / story.metrics.targetWords) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden modal-content relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-ls-green p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(story.status)}`}>
                  {story.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(story.priority)}`}>
                  <Flag size={12} className="inline mr-1" />
                  {story.priority} Priority
                </span>
              </div>
              <h2 className="text-2xl font-bold">{story.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <User size={14} />
                Assignee
              </div>
              <p className="font-semibold text-gray-900">{story.assignee}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock size={14} />
                Due Date
              </div>
              <p className="font-semibold text-gray-900">{story.dueDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar size={14} />
                Publish Date
              </div>
              <p className="font-semibold text-gray-900">{story.publishDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <FileText size={14} />
                Word Count
              </div>
              <p className="font-semibold text-gray-900">
                {story.metrics?.currentWords || 0} / {story.metrics?.targetWords || 0}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Writing Progress</span>
              <span className="text-sm text-gray-500">{progressPercentage}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-ls-green rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* URLs */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <Link2 size={18} className="text-ls-green" />
              Links
            </h3>
            <div className="space-y-2">
              {story.urls?.draft && (
                <a
                  href={story.urls.draft}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Draft Document
                </a>
              )}
              {story.urls?.published && (
                <a
                  href={story.urls.published}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Published Article
                </a>
              )}
              {!story.urls?.draft && !story.urls?.published && (
                <p className="text-gray-400 italic">No links added yet</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <StickyNote size={18} className="text-ls-green" />
              Notes
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-gray-700">{story.notes || 'No notes added yet.'}</p>
            </div>
          </div>

          {/* Milestones */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <CheckCircle2 size={18} className="text-ls-green" />
              Milestones
            </h3>
            <div className="space-y-3">
              {story.milestones?.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    milestone.completed ? 'bg-ls-green-lighter' : 'bg-gray-50'
                  }`}
                >
                  {milestone.completed ? (
                    <CheckCircle2 size={20} className="text-ls-green" />
                  ) : (
                    <Circle size={20} className="text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${milestone.completed ? 'text-ls-green' : 'text-gray-700'}`}>
                      {milestone.name}
                    </p>
                    <p className="text-sm text-gray-500">{milestone.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics (for published stories) */}
          {story.status === 'Published' && story.metrics?.pageViews && (
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                <BarChart2 size={18} className="text-ls-green" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-ls-green-lighter rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-ls-green">
                    {story.metrics.pageViews.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Page Views</p>
                </div>
                <div className="bg-ls-green-lighter rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-ls-green">{story.metrics.avgTimeOnPage}</p>
                  <p className="text-sm text-gray-600">Avg. Time on Page</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-between">
          <div>
            {isCustomStory && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Delete this story?</span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              )
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
            {isCustomStory && onEdit && (
              isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
                >
                  <Edit2 size={18} />
                  Edit Story
                </button>
              )
            )}
          </div>
        </div>

        {/* Edit Form Overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-white rounded-xl flex flex-col">
            <div className="bg-ls-green p-6 text-white">
              <div className="flex items-start justify-between">
                <h2 className="text-2xl font-bold">Edit Story</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story Title *</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  value={editData.author}
                  onChange={(e) => setEditData(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Publish Date</label>
                <input
                  type="date"
                  value={editData.publishDate}
                  onChange={(e) => setEditData(prev => ({ ...prev, publishDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Word Count</label>
                <input
                  type="number"
                  value={editData.wordCount}
                  onChange={(e) => setEditData(prev => ({ ...prev, wordCount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                  rows={4}
                />
              </div>
            </div>
            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
