import React from 'react';
import { BarChart2, TrendingUp, FileText, Users, Calendar } from 'lucide-react';
import { sampleStories } from '../data/events';

export default function RunningTotals() {
  // Calculate statistics
  const stats = {
    total: sampleStories.length,
    published: sampleStories.filter((s) => s.status === 'Published').length,
    inProgress: sampleStories.filter((s) => s.status === 'In Progress').length,
    draft: sampleStories.filter((s) => s.status === 'Draft').length,
    planned: sampleStories.filter((s) => s.status === 'Planned').length,
  };

  const totalWords = sampleStories.reduce((acc, s) => acc + (s.metrics?.currentWords || 0), 0);
  const targetWords = sampleStories.reduce((acc, s) => acc + (s.metrics?.targetWords || 0), 0);

  const byAssignee = sampleStories.reduce((acc, story) => {
    acc[story.assignee] = (acc[story.assignee] || 0) + 1;
    return acc;
  }, {});

  const byPriority = sampleStories.reduce((acc, story) => {
    acc[story.priority] = (acc[story.priority] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Running Totals</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-ls-green-lighter rounded-lg">
              <FileText size={20} className="text-ls-green" />
            </div>
            <span className="text-sm text-gray-500">Total Stories</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Published</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.published}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart2 size={20} className="text-ls-orange" />
            </div>
            <span className="text-sm text-gray-500">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-ls-orange">{stats.inProgress}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText size={20} className="text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Draft</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.draft}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calendar size={20} className="text-gray-600" />
            </div>
            <span className="text-sm text-gray-500">Planned</span>
          </div>
          <p className="text-3xl font-bold text-gray-600">{stats.planned}</p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Word Count Progress */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Word Count Progress</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Total Progress</span>
              <span className="font-medium">{Math.round((totalWords / targetWords) * 100)}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-ls-green rounded-full"
                style={{ width: `${(totalWords / targetWords) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalWords.toLocaleString()}</p>
            <p className="text-sm text-gray-500">of {targetWords.toLocaleString()} words</p>
          </div>
        </div>

        {/* By Assignee */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stories by Assignee</h3>
          <div className="space-y-3">
            {Object.entries(byAssignee).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-ls-green-lighter rounded-full flex items-center justify-center">
                    <Users size={14} className="text-ls-green" />
                  </div>
                  <span className="text-gray-700">{name}</span>
                </div>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stories by Priority</h3>
          <div className="space-y-3">
            {Object.entries(byPriority).map(([priority, count]) => {
              const colors = {
                High: 'bg-red-100 text-red-600',
                Medium: 'bg-orange-100 text-ls-orange',
                Low: 'bg-gray-100 text-gray-600',
              };
              return (
                <div key={priority} className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[priority]}`}>
                    {priority}
                  </span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
