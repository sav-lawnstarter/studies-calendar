import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Download, Calendar, Ban } from 'lucide-react';

const viewModes = ['Week', 'Month', 'Quarter'];

export default function CalendarHeader({
  title,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  onAddStory,
  onAddOOO,
  onBlockDate,
  onExport,
}) {
  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title and Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToday}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={onNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>

        {/* Center: View Mode Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {viewModes.map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-md transition-all
                ${
                  viewMode === mode
                    ? 'bg-white text-ls-green shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddStory}
            className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
          >
            <Plus size={18} />
            Add Story
          </button>
          <button
            onClick={onAddOOO}
            className="flex items-center gap-2 px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright transition-colors"
          >
            <Calendar size={18} />
            Add OOO
          </button>
          <button
            onClick={onBlockDate}
            className="flex items-center gap-2 px-4 py-2 border border-ls-orange text-ls-orange rounded-lg hover:bg-ls-orange-light transition-colors"
          >
            <Ban size={18} />
            Block Date
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
