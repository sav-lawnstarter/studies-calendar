import React from 'react';
import { BarChart2, TrendingUp, FileText, Building2, Calendar, Clock } from 'lucide-react';

export default function RunningTotals({ stories = [] }) {
  // Calculate statistics
  const stats = {
    total: stories.length,
    pitched: stories.filter((s) => s.status === 'Pitched').length,
    inProgress: stories.filter((s) => s.status === 'In Progress').length,
    published: stories.filter((s) => s.status === 'Published').length,
  };

  // Stories by brand
  const byBrand = stories.reduce((acc, story) => {
    const brand = story.brand || 'Unassigned';
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {});

  // Stories by status
  const byStatus = stories.reduce((acc, story) => {
    acc[story.status] = (acc[story.status] || 0) + 1;
    return acc;
  }, {});

  // Sort stories by pitch date (most recent first)
  const storiesByPitchDate = [...stories].sort((a, b) => {
    if (!a.pitchDate) return 1;
    if (!b.pitchDate) return -1;
    return new Date(b.pitchDate) - new Date(a.pitchDate);
  });

  const brandColors = {
    'LawnStarter': 'bg-ls-green text-white',
    'Lawn Love': 'bg-pink-500 text-white',
    'Home Gnome': 'bg-purple-500 text-white',
    'Unassigned': 'bg-gray-400 text-white',
  };

  const statusColors = {
    'Pitched': 'bg-ls-blue text-white',
    'In Progress': 'bg-ls-orange text-white',
    'Published': 'bg-ls-green text-white',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Running Totals</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-ls-green-lighter rounded-lg">
              <FileText size={20} className="text-ls-green" />
            </div>
            <span className="text-sm text-gray-500">Total Stories Pitched</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock size={20} className="text-ls-blue" />
            </div>
            <span className="text-sm text-gray-500">Pitched</span>
          </div>
          <p className="text-3xl font-bold text-ls-blue">{stats.pitched}</p>
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
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Published</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.published}</p>
        </div>
      </div>

      {/* Brand and Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* By Brand */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <Building2 size={20} className="text-ls-green" />
            Stories by Brand
          </h3>
          {Object.keys(byBrand).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byBrand).map(([brand, count]) => (
                <div key={brand} className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${brandColors[brand] || 'bg-gray-400 text-white'}`}>
                    {brand}
                  </span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No stories yet. Add stories from the Content Calendar.</p>
          )}
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <BarChart2 size={20} className="text-ls-green" />
            Stories by Status
          </h3>
          {Object.keys(byStatus).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || 'bg-gray-400 text-white'}`}>
                    {status}
                  </span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No stories yet. Add stories from the Content Calendar.</p>
          )}
        </div>
      </div>

      {/* Stories Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Calendar size={20} className="text-ls-green" />
            Stories by Pitch Date
          </h3>
        </div>
        {storiesByPitchDate.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Brand</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Pitch Date</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {storiesByPitchDate.map((story) => (
                  <tr key={story.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{story.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${brandColors[story.brand] || 'bg-gray-400 text-white'}`}>
                        {story.brand || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {story.pitchDate || 'Not set'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[story.status] || 'bg-gray-400 text-white'}`}>
                        {story.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No stories yet.</p>
            <p className="text-sm text-gray-400 mt-1">Add stories from the Content Calendar to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
