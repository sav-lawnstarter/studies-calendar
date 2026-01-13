import React, { useState } from 'react';
import { Plus, ExternalLink, Search, Calendar, Building2 } from 'lucide-react';
import { competitorLog } from '../data/events';

export default function CompetitorLog() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = competitorLog.filter(
    (log) =>
      log.competitor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Competitor Log</h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors">
            <Plus size={18} />
            Add Entry
          </button>
        </div>
      </div>

      {/* Log Cards */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-ls-green-lighter rounded-full">
                    <Building2 size={14} className="text-ls-green" />
                    <span className="text-sm font-medium text-ls-green">{log.competitor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar size={14} />
                    {log.date}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{log.activity}</h3>
                <p className="text-gray-600">{log.notes}</p>
              </div>
              {log.url && (
                <a
                  href={log.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors ml-4"
                >
                  <ExternalLink size={16} />
                  View
                </a>
              )}
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <p className="text-gray-500">No competitor activities found.</p>
          </div>
        )}
      </div>

      {/* Competitor Summary */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Competitors</h3>
          <div className="space-y-3">
            {['TruGreen', 'Scotts', 'Sunday Lawn Care'].map((competitor, index) => {
              const count = competitorLog.filter((l) => l.competitor === competitor).length;
              return (
                <div key={competitor} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-ls-green-lighter rounded-full flex items-center justify-center text-xs font-medium text-ls-green">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{competitor}</span>
                  </div>
                  <span className="text-sm text-gray-500">{count} activities</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Types</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Content Published</span>
              <span className="font-medium text-gray-900">2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Video/Media</span>
              <span className="font-medium text-gray-900">1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Campaigns</span>
              <span className="font-medium text-gray-900">1</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trends</h3>
          <p className="text-gray-600 text-sm">
            Competitors are focusing on video content and user-generated campaigns. Consider
            increasing multimedia content production.
          </p>
        </div>
      </div>
    </div>
  );
}
