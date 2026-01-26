import React from 'react';
import { format, parseISO } from 'date-fns';
import {
  X,
  ExternalLink,
  Calendar,
  Building2,
  Flag,
  FileText,
  Users,
  Clock,
  Link2,
  StickyNote,
  Trash2,
  Edit3,
} from 'lucide-react';

export default function StoryDetailModal({ story, onClose, onEdit, onDelete }) {
  if (!story) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getBrandColor = (brand) => {
    switch (brand) {
      case 'LawnStarter':
        return 'bg-ls-green text-white';
      case 'Lawn Love':
        return 'bg-pink-500 text-white';
      case 'Home Gnome':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const hasUrls = story.urls?.research || story.urls?.methodology || story.urls?.officialAnalysis || story.urls?.publishedStory;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-ls-green p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBrandColor(story.brand)}`}>
                  {story.brand || 'LawnStarter'}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar size={14} />
                Pitch Date
              </div>
              <p className="font-semibold text-gray-900">{formatDate(story.pitchDate)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Flag size={14} />
                News Peg
              </div>
              <p className="font-semibold text-gray-900">{story.newsPeg || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Users size={14} />
                Experts Contacted
              </div>
              <p className="font-semibold text-gray-900">{story.expertsContacted || 0}</p>
            </div>
          </div>

          {/* Due Dates Section */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <Clock size={18} className="text-ls-green" />
              Timeline
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-blue-600 font-medium">Analysis Due</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(story.analysisDueBy)}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                <p className="text-xs text-yellow-600 font-medium">Draft Due</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(story.draftDueBy)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <p className="text-xs text-orange-600 font-medium">Edits Due</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(story.editsDueBy)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <p className="text-xs text-purple-600 font-medium">QA Due</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(story.qaDueBy)}</p>
              </div>
            </div>
            {story.productionDate && (
              <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-100">
                <p className="text-xs text-green-600 font-medium">Production Date</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(story.productionDate)}</p>
              </div>
            )}
          </div>

          {/* URLs */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <Link2 size={18} className="text-ls-green" />
              Links
            </h3>
            <div className="space-y-2">
              {story.urls?.research && (
                <a
                  href={story.urls.research}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Research Document
                </a>
              )}
              {story.urls?.methodology && (
                <a
                  href={story.urls.methodology}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Methodology
                </a>
              )}
              {story.urls?.officialAnalysis && (
                <a
                  href={story.urls.officialAnalysis}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Official Analysis
                </a>
              )}
              {story.urls?.publishedStory && (
                <a
                  href={story.urls.publishedStory}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Published Story
                </a>
              )}
              {!hasUrls && (
                <p className="text-gray-400 italic">No links added yet</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <StickyNote size={18} className="text-ls-green" />
              Notes/Blockers
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{story.notes || 'No notes added yet.'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-between">
          <button
            onClick={() => onDelete && onDelete(story.id)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onEdit && onEdit(story)}
              className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
            >
              <Edit3 size={18} />
              Edit Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
