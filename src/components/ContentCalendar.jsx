import React, { useState, useMemo, useEffect } from 'react';
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
  getMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Download, Calendar, Ban, X, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { preloadedEvents, sampleStories, sampleOOO, sampleBlockedDates } from '../data/events';
import StoryDetailModal from './StoryDetailModal';

const viewModes = ['Week', 'Month', 'Quarter'];

// localStorage keys
const STORAGE_KEYS = {
  blockedDates: 'editorial-blocked-dates',
  hiddenEvents: 'editorial-hidden-events',
  eventOverrides: 'editorial-event-overrides',
};

// Custom quarter definitions
// Q4: Dec 1 - Feb 28/29, Q1: Mar 1 - May 31, Q2: Jun 1 - Aug 31, Q3: Sep 1 - Nov 30
const getCustomQuarter = (date) => {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  if (month >= 2 && month <= 4) { // Mar-May
    return { quarter: 1, fiscalYear: year % 100 };
  }
  if (month >= 5 && month <= 7) { // Jun-Aug
    return { quarter: 2, fiscalYear: year % 100 };
  }
  if (month >= 8 && month <= 10) { // Sep-Nov
    return { quarter: 3, fiscalYear: year % 100 };
  }
  // Q4: Dec or Jan-Feb
  if (month === 11) { // December
    return { quarter: 4, fiscalYear: year % 100 };
  }
  // Jan-Feb: Q4 of previous fiscal year
  return { quarter: 4, fiscalYear: (year - 1) % 100 };
};

const getCustomQuarterStart = (date) => {
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month >= 2 && month <= 4) return new Date(year, 2, 1); // Mar 1
  if (month >= 5 && month <= 7) return new Date(year, 5, 1); // Jun 1
  if (month >= 8 && month <= 10) return new Date(year, 8, 1); // Sep 1
  if (month === 11) return new Date(year, 11, 1); // Dec 1
  // Jan-Feb: Dec 1 of previous year
  return new Date(year - 1, 11, 1);
};

const getCustomQuarterEnd = (date) => {
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month >= 2 && month <= 4) return new Date(year, 4, 31); // May 31
  if (month >= 5 && month <= 7) return new Date(year, 7, 31); // Aug 31
  if (month >= 8 && month <= 10) return new Date(year, 10, 30); // Nov 30
  if (month === 11) return endOfMonth(new Date(year + 1, 1, 1)); // Feb end of next year
  // Jan-Feb: Feb end of current year
  return endOfMonth(new Date(year, 1, 1));
};

// Load data from localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Save data to localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('Month');
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Modal states for action buttons
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [showAddOOOModal, setShowAddOOOModal] = useState(false);
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);

  // Custom data states with localStorage persistence
  const [customStories, setCustomStories] = useState(() =>
    loadFromStorage('editorial-custom-stories', [])
  );
  const [customOOO, setCustomOOO] = useState(() =>
    loadFromStorage('editorial-custom-ooo', [])
  );

  // Persistent state for custom blocked dates
  const [customBlockedDates, setCustomBlockedDates] = useState(() =>
    loadFromStorage(STORAGE_KEYS.blockedDates, [])
  );

  // Persistent state for hidden events (deleted events)
  const [hiddenEvents, setHiddenEvents] = useState(() =>
    loadFromStorage(STORAGE_KEYS.hiddenEvents, [])
  );

  // Persistent state for event type overrides (toggled between blocked/highTraffic)
  const [eventOverrides, setEventOverrides] = useState(() =>
    loadFromStorage(STORAGE_KEYS.eventOverrides, {})
  );

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.blockedDates, customBlockedDates);
  }, [customBlockedDates]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.hiddenEvents, hiddenEvents);
  }, [hiddenEvents]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.eventOverrides, eventOverrides);
  }, [eventOverrides]);

  useEffect(() => {
    saveToStorage('editorial-custom-stories', customStories);
  }, [customStories]);

  useEffect(() => {
    saveToStorage('editorial-custom-ooo', customOOO);
  }, [customOOO]);

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

    // Add custom stories
    customStories.forEach((story) => {
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

    // Add custom OOO
    customOOO.forEach((ooo) => {
      events.push({
        ...ooo,
        displayType: 'ooo',
      });
    });

    // Add blocked dates from data file
    sampleBlockedDates.forEach((blocked) => {
      if (!hiddenEvents.includes(blocked.id)) {
        const override = eventOverrides[blocked.id];
        events.push({
          ...blocked,
          type: override?.type || blocked.type,
          displayType: override?.type || 'blocked',
        });
      }
    });

    // Add custom blocked dates
    customBlockedDates.forEach((blocked) => {
      if (!hiddenEvents.includes(blocked.id)) {
        events.push({
          ...blocked,
          displayType: blocked.type,
        });
      }
    });

    // Add preloaded events (holidays, sports, etc.) - filter out hidden ones and apply overrides
    preloadedEvents.forEach((event) => {
      if (!hiddenEvents.includes(event.id)) {
        const override = eventOverrides[event.id];
        const effectiveType = override?.type || event.type;
        events.push({
          ...event,
          type: effectiveType,
          displayType: effectiveType,
        });
      }
    });

    return events;
  }, [customBlockedDates, hiddenEvents, eventOverrides, customStories, customOOO]);

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
      setCurrentDate(subMonths(currentDate, 3));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'Week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === 'Month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 3));
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
      const quarterStart = getCustomQuarterStart(currentDate);
      const quarterEnd = getCustomQuarterEnd(currentDate);
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
      const { quarter, fiscalYear } = getCustomQuarter(currentDate);
      return `Q${quarter} ${fiscalYear}`;
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

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    if (event.displayType === 'story') {
      // Find the full story data
      const fullStory = sampleStories.find((s) => s.id === event.id);
      setSelectedStory(fullStory);
    } else if (['blocked', 'highTraffic', 'holiday'].includes(event.displayType)) {
      // Open edit modal for blocked dates and high traffic events
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  };

  // Delete/hide an event
  const handleDeleteEvent = (eventId) => {
    setHiddenEvents(prev => [...prev, eventId]);
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  // Toggle event type between blocked and highTraffic
  const handleToggleEventType = (eventId, currentType) => {
    const newType = currentType === 'blocked' ? 'highTraffic' :
                    currentType === 'highTraffic' ? 'blocked' :
                    currentType;

    setEventOverrides(prev => ({
      ...prev,
      [eventId]: { type: newType }
    }));

    // Update selected event to reflect the change
    setSelectedEvent(prev => prev ? { ...prev, type: newType, displayType: newType } : null);
  };

  // Restore a hidden event
  const handleRestoreEvent = (eventId) => {
    setHiddenEvents(prev => prev.filter(id => id !== eventId));
  };

  // Clear all customizations for an event
  const handleResetEvent = (eventId) => {
    setEventOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[eventId];
      return newOverrides;
    });
    setHiddenEvents(prev => prev.filter(id => id !== eventId));
  };

  // Handler for adding a new story
  const handleAddStory = (storyData) => {
    const newStory = {
      id: `custom-story-${Date.now()}`,
      title: storyData.title,
      publishDate: storyData.date,
      status: 'Planned',
      author: storyData.author || 'Editorial Team',
      category: storyData.category || 'General',
    };
    setCustomStories(prev => [...prev, newStory]);
    setShowAddStoryModal(false);
  };

  // Handler for adding OOO
  const handleAddOOO = (oooData) => {
    const newOOO = {
      id: `custom-ooo-${Date.now()}`,
      title: `${oooData.person} - OOO`,
      date: oooData.startDate,
      endDate: oooData.endDate || oooData.startDate,
      person: oooData.person,
      type: 'ooo',
    };
    setCustomOOO(prev => [...prev, newOOO]);
    setShowAddOOOModal(false);
  };

  // Handler for adding blocked date
  const handleAddBlockedDate = (blockedData) => {
    const newBlocked = {
      id: `custom-blocked-${Date.now()}`,
      title: blockedData.reason || 'Blocked',
      date: blockedData.date,
      endDate: blockedData.endDate || blockedData.date,
      type: blockedData.type || 'blocked',
      reason: blockedData.reason,
    };
    setCustomBlockedDates(prev => [...prev, newBlocked]);
    setShowBlockDateModal(false);
  };

  // Handler for exporting to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Title', 'Author/Person', 'Category/Reason'];
    const rows = allEvents.map(event => [
      event.date,
      event.displayType,
      event.title,
      event.author || event.person || '',
      event.category || event.reason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `editorial-calendar-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const renderEvent = (event) => {
    const style = getEventStyle(event.displayType);
    const isClickable = ['story', 'blocked', 'highTraffic', 'holiday'].includes(event.displayType);

    return (
      <div
        key={event.id}
        onClick={(e) => handleEventClick(event, e)}
        className={`
          text-xs px-2 py-1 rounded truncate mb-1 event-item
          ${style}
          ${isClickable ? 'cursor-pointer hover:opacity-90' : ''}
        `}
        title={`${event.title}${isClickable && event.displayType !== 'story' ? ' (click to edit)' : ''}`}
      >
        {event.title}
      </div>
    );
  };

  // Event Edit Modal
  const EventEditModal = () => {
    if (!showEventModal || !selectedEvent) return null;

    const isCustomEvent = selectedEvent.id?.startsWith('custom-');
    const hasOverride = eventOverrides[selectedEvent.id];
    const canToggle = ['blocked', 'highTraffic'].includes(selectedEvent.displayType);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEventModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Edit Event</h3>
            <button
              onClick={() => setShowEventModal(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <p className="text-gray-900">{selectedEvent.title}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <p className="text-gray-900">
                {format(parseISO(selectedEvent.date), 'MMMM d, yyyy')}
                {selectedEvent.endDate && ` - ${format(parseISO(selectedEvent.endDate), 'MMMM d, yyyy')}`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex items-center gap-2">
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${selectedEvent.displayType === 'blocked' ? 'bg-ls-orange-light text-ls-orange border border-ls-orange' : ''}
                  ${selectedEvent.displayType === 'highTraffic' ? 'bg-ls-blue text-white' : ''}
                  ${selectedEvent.displayType === 'holiday' ? 'bg-gray-100 text-gray-700 border border-gray-300' : ''}
                `}>
                  {selectedEvent.displayType === 'blocked' ? 'Blocked' :
                   selectedEvent.displayType === 'highTraffic' ? 'High Traffic' :
                   selectedEvent.displayType === 'holiday' ? 'Holiday' : selectedEvent.displayType}
                </span>
                {hasOverride && (
                  <span className="text-xs text-gray-500">(modified)</span>
                )}
              </div>
            </div>

            {selectedEvent.category && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <p className="text-gray-600">{selectedEvent.category}</p>
              </div>
            )}

            {selectedEvent.reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <p className="text-gray-600">{selectedEvent.reason}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t bg-gray-50 rounded-b-xl space-y-3">
            {canToggle && (
              <button
                onClick={() => handleToggleEventType(selectedEvent.id, selectedEvent.displayType)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ls-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw size={18} />
                Toggle to {selectedEvent.displayType === 'blocked' ? 'High Traffic' : 'Blocked'}
              </button>
            )}

            <button
              onClick={() => handleDeleteEvent(selectedEvent.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <EyeOff size={18} />
              Hide This Event
            </button>

            {hasOverride && (
              <button
                onClick={() => handleResetEvent(selectedEvent.id)}
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
  };

  // Count hidden events
  const hiddenCount = hiddenEvents.length;

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
            <button
              onClick={() => setShowAddStoryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
            >
              <Plus size={18} />
              Add Story
            </button>
            <button
              onClick={() => setShowAddOOOModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright transition-colors"
            >
              <Calendar size={18} />
              Add OOO
            </button>
            <button
              onClick={() => setShowBlockDateModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-ls-orange text-ls-orange rounded-lg hover:bg-ls-orange-light transition-colors"
            >
              <Ban size={18} />
              Block Date
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
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
          {weeks.map((week, weekIndex) => {
            // Show month header in Quarter view when month changes
            const showMonthHeader = viewMode === 'Quarter' && (
              weekIndex === 0 ||
              getMonth(week[0]) !== getMonth(weeks[weekIndex - 1][0])
            );

            return (
              <React.Fragment key={weekIndex}>
                {showMonthHeader && (
                  <div className="bg-ls-green-lighter border-b border-ls-green/30 px-4 py-2 sticky z-10">
                    <span className="text-ls-green font-semibold text-sm">
                      {format(week[0], 'MMMM yyyy')}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-7 border-b">
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
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}

      {/* Event Edit Modal */}
      <EventEditModal />

      {/* Add Story Modal */}
      {showAddStoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddStoryModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Story</h3>
              <button
                onClick={() => setShowAddStoryModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleAddStory({
                title: formData.get('title'),
                date: formData.get('date'),
                author: formData.get('author'),
                category: formData.get('category'),
              });
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                  placeholder="Enter story title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Publish Date *</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  name="author"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                  placeholder="Author name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-ls-green"
                >
                  <option value="Lawn Care">Lawn Care</option>
                  <option value="Landscaping">Landscaping</option>
                  <option value="Pest Control">Pest Control</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddStoryModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
                >
                  Add Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add OOO Modal */}
      {showAddOOOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddOOOModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Out of Office</h3>
              <button
                onClick={() => setShowAddOOOModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleAddOOO({
                person: formData.get('person'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
              });
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Member *</label>
                <input
                  type="text"
                  name="person"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-ls-orange"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-ls-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-ls-orange"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddOOOModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright transition-colors"
                >
                  Add OOO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Date Modal */}
      {showBlockDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlockDateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Block Date</h3>
              <button
                onClick={() => setShowBlockDateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleAddBlockedDate({
                reason: formData.get('reason'),
                date: formData.get('date'),
                endDate: formData.get('endDate'),
                type: formData.get('type'),
              });
            }} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <input
                  type="text"
                  name="reason"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-ls-orange"
                  placeholder="Enter reason for blocking"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-ls-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-ls-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-ls-orange"
                >
                  <option value="blocked">Blocked</option>
                  <option value="highTraffic">High Traffic</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBlockDateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright transition-colors"
                >
                  Block Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
