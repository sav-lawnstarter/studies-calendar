import React from 'react';
import { format, parseISO } from 'date-fns';
import { X, RefreshCw, EyeOff } from 'lucide-react';

export default function EventEditModal({
  event,
  isOpen,
  onClose,
  onDelete,
  onToggleType,
  onReset,
  eventOverrides,
}) {
  if (!isOpen || !event) return null;

  const hasOverride = eventOverrides && eventOverrides[event.id];
  const canToggle = ['blocked', 'highTraffic'].includes(event.displayType);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Edit Event</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name
            </label>
            <p className="text-gray-900">{event.title}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <p className="text-gray-900">
              {format(parseISO(event.date), 'MMMM d, yyyy')}
              {event.endDate &&
                ` - ${format(parseISO(event.endDate), 'MMMM d, yyyy')}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${
                  event.displayType === 'blocked'
                    ? 'bg-ls-orange-light text-ls-orange border border-ls-orange'
                    : ''
                }
                ${
                  event.displayType === 'highTraffic'
                    ? 'bg-ls-blue text-white'
                    : ''
                }
                ${
                  event.displayType === 'holiday'
                    ? 'bg-gray-100 text-gray-700 border border-gray-300'
                    : ''
                }
              `}
              >
                {event.displayType === 'blocked'
                  ? 'Blocked'
                  : event.displayType === 'highTraffic'
                  ? 'High Traffic'
                  : event.displayType === 'holiday'
                  ? 'Holiday'
                  : event.displayType}
              </span>
              {hasOverride && (
                <span className="text-xs text-gray-500">(modified)</span>
              )}
            </div>
          </div>

          {event.category && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <p className="text-gray-600">{event.category}</p>
            </div>
          )}

          {event.reason && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <p className="text-gray-600">{event.reason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50 rounded-b-xl space-y-3">
          {canToggle && (
            <button
              onClick={() => onToggleType(event.id, event.displayType)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ls-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw size={18} />
              Toggle to {event.displayType === 'blocked' ? 'High Traffic' : 'Blocked'}
            </button>
          )}

          <button
            onClick={() => onDelete(event.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <EyeOff size={18} />
            Hide This Event
          </button>

          {hasOverride && (
            <button
              onClick={() => onReset(event.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={18} />
              Reset to Original
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
