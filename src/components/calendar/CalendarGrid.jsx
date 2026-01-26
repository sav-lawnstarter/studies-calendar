import React from 'react';
import { format, isSameMonth, isSameDay, isWithinInterval, parseISO } from 'date-fns';

// Event styling based on type
const getEventStyle = (displayType) => {
  switch (displayType) {
    case 'story':
      return 'bg-ls-green text-white hover:bg-ls-green-light cursor-pointer';
    case 'ooo':
      return 'bg-ls-orange text-white';
    case 'blocked':
      return 'bg-ls-orange-light text-ls-orange border border-ls-orange';
    case 'highTraffic':
      return 'bg-ls-blue text-white';
    case 'holiday':
      return 'bg-gray-100 text-gray-700 border border-gray-300';
    default:
      return 'bg-gray-200 text-gray-700';
  }
};

function CalendarEvent({ event, onClick }) {
  const style = getEventStyle(event.displayType);
  const isClickable = ['story', 'blocked', 'highTraffic', 'holiday'].includes(
    event.displayType
  );

  return (
    <div
      onClick={(e) => onClick(event, e)}
      className={`
        text-xs px-2 py-1 rounded truncate mb-1 event-item
        ${style}
        ${isClickable ? 'cursor-pointer hover:opacity-90' : ''}
      `}
      title={`${event.title}${
        isClickable && event.displayType !== 'story' ? ' (click to edit)' : ''
      }`}
    >
      {event.title}
    </div>
  );
}

function CalendarDay({ day, events, isCurrentMonth, viewMode, onEventClick }) {
  const isToday = isSameDay(day, new Date());

  return (
    <div
      className={`
        min-h-[120px] border-r last:border-r-0 p-2 calendar-cell
        ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`
            text-sm font-medium
            ${
              isToday
                ? 'bg-ls-green text-white w-7 h-7 rounded-full flex items-center justify-center'
                : isCurrentMonth
                ? 'text-gray-900'
                : 'text-gray-400'
            }
          `}
        >
          {format(day, 'd')}
        </span>
      </div>
      <div className="space-y-1 overflow-y-auto max-h-[90px]">
        {events.slice(0, 4).map((event) => (
          <CalendarEvent key={event.id} event={event} onClick={onEventClick} />
        ))}
        {events.length > 4 && (
          <div className="text-xs text-gray-500 px-2">
            +{events.length - 4} more
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarGrid({
  weeks,
  currentDate,
  viewMode,
  allEvents,
  onEventClick,
}) {
  // Get events for a specific day
  const getEventsForDay = (day) => {
    return allEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      if (event.endDate) {
        const endDate = parseISO(event.endDate);
        return (
          isWithinInterval(day, { start: eventDate, end: endDate }) ||
          isSameDay(day, eventDate)
        );
      }
      return isSameDay(day, eventDate);
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Day Headers */}
      <div className="grid grid-cols-7 bg-gray-50 border-b sticky top-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-gray-600 border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Body */}
      <div className="flex-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b">
            {week.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth =
                viewMode === 'Month' ? isSameMonth(day, currentDate) : true;

              return (
                <CalendarDay
                  key={day.toISOString()}
                  day={day}
                  events={dayEvents}
                  isCurrentMonth={isCurrentMonth}
                  viewMode={viewMode}
                  onEventClick={onEventClick}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
