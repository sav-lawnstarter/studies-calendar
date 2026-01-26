import React from 'react';

export default function CalendarLegend({ hiddenCount }) {
  return (
    <div className="bg-gray-50 px-6 py-2 border-b flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-500">Legend:</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-ls-green"></div>
            <span className="text-sm text-gray-600">Stories</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-ls-orange"></div>
            <span className="text-sm text-gray-600">Team OOO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-ls-orange-light border border-ls-orange"></div>
            <span className="text-sm text-gray-600">Blocked Dates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-ls-blue"></div>
            <span className="text-sm text-gray-600">High Traffic Days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300"></div>
            <span className="text-sm text-gray-600">Holidays</span>
          </div>
        </div>
      </div>
      {hiddenCount > 0 && (
        <div className="text-sm text-gray-500">
          {hiddenCount} event{hiddenCount !== 1 ? 's' : ''} hidden
        </div>
      )}
    </div>
  );
}
