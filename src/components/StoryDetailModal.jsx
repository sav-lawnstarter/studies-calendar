import React from 'react';
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
  Building2,
  Users,
  Trash2,
  Edit,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function StoryDetailModal({ story, onClose, onEdit, onDelete }) {
  if (!story) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

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
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20">
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
              <p className="font-semibold text-gray-900">{story.newsPeg || 'None'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Users size={14} />
                Experts Contacted
              </div>
              <p className="font-semibold text-gray-900">{story.expertsContacted || '0'}</p>
            </div>
          </div>

          {/* Due Dates Section */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <Clock size={18} className="text-ls-green" />
              Due Dates
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Analysis Due</p>
                <p className="font-medium text-gray-900 text-sm">{formatDate(story.analysisDueBy)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Draft Due</p>
                <p className="font-medium text-gray-900 text-sm">{formatDate(story.draftDueBy)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Edits Due</p>
                <p className="font-medium text-gray-900 text-sm">{formatDate(story.editsDueBy)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">QA Due</p>
                <p className="font-medium text-gray-900 text-sm">{formatDate(story.qaDueBy)}</p>
              </div>
            </div>
          </div>

          {/* Production Date */}
          <div className="mb-6">
            <div className="bg-ls-green-lighter rounded-lg p-4">
              <div className="flex items-center gap-2 text-ls-green text-sm mb-1">
                <Calendar size={14} />
                Production Date
              </div>
              <p className="font-bold text-ls-green-dark text-lg">{formatDate(story.productionDate)}</p>
            </div>
          </div>

          {/* URLs */}
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <Link2 size={18} className="text-ls-green" />
              Links
            </h3>
            <div className="space-y-2">
              {story.researchUrl && (
                <a
                  href={story.researchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Research Document
                </a>
              )}
              {story.methodologyUrl && (
                <a
                  href={story.methodologyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Methodology
                </a>
              )}
              {story.analysisUrl && (
                <a
                  href={story.analysisUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Official Analysis
                </a>
              )}
              {story.publishedUrl && (
                <a
                  href={story.publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
                >
                  <ExternalLink size={14} />
                  Published Story
                </a>
              )}
              {!story.researchUrl && !story.methodologyUrl && !story.analysisUrl && !story.publishedUrl && (
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
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
            >
              <Edit size={18} />
              Edit Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
