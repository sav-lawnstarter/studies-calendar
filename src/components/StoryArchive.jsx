import React, { useState } from 'react';
import { Search, ExternalLink, ChevronDown, Eye, Archive } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import StoryDetailModal from './StoryDetailModal';

export default function StoryArchive() {
  const { stories } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStory, setSelectedStory] = useState(null);

  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      story.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.assignee?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || story.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      Published: 'bg-ls-green text-white',
      'In Progress': 'bg-ls-orange text-white',
      Draft: 'bg-yellow-500 text-white',
      Planned: 'bg-gray-400 text-white',
    };
    return styles[status] || 'bg-gray-300 text-gray-700';
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      High: 'text-red-600 bg-red-50 border-red-200',
      Medium: 'text-ls-orange bg-orange-50 border-orange-200',
      Low: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return styles[priority] || 'text-gray-500 bg-gray-50';
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

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Status</option>
              <option value="Published">Published</option>
              <option value="In Progress">In Progress</option>
              <option value="Draft">Draft</option>
              <option value="Planned">Planned</option>
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
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Priority</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Assignee</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Due Date</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Publish Date</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Progress</th>
              <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStories.map((story) => {
              const progress = story.metrics?.targetWords
                ? Math.round((story.metrics.currentWords / story.metrics.targetWords) * 100)
                : 0;

              return (
                <tr key={story.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedStory(story)}
                      className="text-left hover:text-ls-green transition-colors"
                    >
                      <p className="font-medium text-gray-900 hover:text-ls-green">{story.title}</p>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(story.status)}`}>
                      {story.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityBadge(story.priority)}`}>
                      {story.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{story.assignee || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{story.dueDate || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{story.publishDate || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ls-green rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedStory(story)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </button>
                      {story.urls?.published && (
                        <a
                          href={story.urls.published}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Published"
                        >
                          <ExternalLink size={16} className="text-gray-600" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredStories.length === 0 && (
          <div className="text-center py-12">
            <Archive size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {stories.length === 0
                ? 'No stories yet. Add stories from the Content Calendar.'
                : 'No stories found matching your criteria.'}
            </p>
          </div>
        )}
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </div>
  );
}
