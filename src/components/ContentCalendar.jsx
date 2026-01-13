import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfQuarter,
  endOfQuarter,
  addQuarters,
  subQuarters,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Download, Calendar, Ban } from 'lucide-react';
import { preloadedEvents, sampleStories, sampleOOO, sampleBlockedDates } from '../data/events';
import StoryDetailModal from './StoryDetailModal';

const viewModes = ['Week', 'Month', 'Quarter'];

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('Month');
  const [selectedStory, setSelectedStory] = useState(null);

  // Combine all events
  const allEvents = useMemo(() => {
    const events = [];

    // Add stories (shown on publish date)
    sampleStories.forEach((story) => {
      events.push({
        ...story,
        date: story.publishDate,
        displayType: 'story',
      });
    });

    // Add OOO
    sampleOOO.forEach((ooo) => {
      events.push({
        ...ooo,
        displayType: 'ooo',
      });
    });

    // Add blocked dates
    sampleBlockedDates.forEach((blocked) => {
      events.push({
        ...blocked,
        displayType: 'blocked',
      });
    });

    // Add preloaded events (holidays, sports, etc.)
    preloadedEvents.forEach((event) => {
      events.push({
        ...event,
        displayType: event.type,
      });
    });

    return events;
  }, []);

  // Get events for a specific day
  const getEventsForDay = (day) => {
    return allEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      if (event.endDate) {
        const endDate = parseISO(event.endDate);
        return isWithinInterval(day, { start: eventDate, end: endDate }) || isSameDay(day, eventDate);
      }
      return isSameDay(day, eventDate);
    });
  };

  // Navigation functions
  const navigatePrev = () => {
    if (viewMode === 'Week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (viewMode === 'Month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subQuarters(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'Week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === 'Month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addQuarters(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate date range based on view mode
  const getDateRange = () => {
    if (viewMode === 'Week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start, end };
    } else if (viewMode === 'Month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 0 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return { start, end };
    } else {
      const quarterStart = startOfQuarter(currentDate);
      const quarterEnd = endOfQuarter(currentDate);
      const start = startOfWeek(quarterStart, { weekStartsOn: 0 });
      const end = endOfWeek(quarterEnd, { weekStartsOn: 0 });
      return { start, end };
    }
  };

  // Generate calendar days
  const generateDays = () => {
    const { start, end } = getDateRange();
    const days = [];
    let day = start;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  const days = generateDays();
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Get title based on view mode
  const getTitle = () => {
    if (viewMode === 'Week') {
      const { start, end } = getDateRange();
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else if (viewMode === 'Month') {
      return format(currentDate, 'MMMM yyyy');
    } else {
      const quarterStart = startOfQuarter(currentDate);
      const quarter = Math.floor(quarterStart.getMonth() / 3) + 1;
      return `Q${quarter} ${format(currentDate, 'yyyy')}`;
    }
  };

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

  const handleEventClick = (event) => {
    if (event.displayType === 'story') {
      // Find the full story data
      const fullStory = sampleStories.find((s) => s.id === event.id);
      setSelectedStory(fullStory);
    }
  };

  const renderEvent = (event) => {
    const style = getEventStyle(event.displayType);
    const isClickable = event.displayType === 'story';

    return (
      <div
        key={event.id}
        onClick={() => handleEventClick(event)}
        className={`
          text-xs px-2 py-1 rounded truncate mb-1 event-item
          ${style}
          ${isClickable ? 'cursor-pointer' : ''}
        `}
        title={event.title}
      >
        {event.title}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Title and Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={navigatePrev}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{getTitle()}</h2>
          </div>

          {/* Center: View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {viewModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-4 py-1.5 text-sm font-medium rounded-md transition-all
                  ${viewMode === mode
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
            <button className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors">
              <Plus size={18} />
              Add Story
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright transition-colors">
              <Calendar size={18} />
              Add OOO
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-ls-orange text-ls-orange rounded-lg hover:bg-ls-orange-light transition-colors">
              <Ban size={18} />
              Block Date
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-6 py-2 border-b flex items-center gap-6">
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

      {/* Calendar Grid */}
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
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = viewMode === 'Month' ? isSameMonth(day, currentDate) : true;

                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      min-h-[120px] border-r last:border-r-0 p-2 calendar-cell
                      ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`
                          text-sm font-medium
                          ${isToday
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
                      {dayEvents.slice(0, 4).map(renderEvent)}
                      {dayEvents.length > 4 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{dayEvents.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
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
