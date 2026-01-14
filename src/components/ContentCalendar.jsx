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
  startOfQuarter,
  endOfQuarter,
  addQuarters,
  subQuarters,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Download, Calendar, Ban, X, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { preloadedEvents, sampleOOO, sampleBlockedDates } from '../data/events';
import StoryDetailModal from './StoryDetailModal';

const BRANDS = ['LawnStarter', 'Lawn Love', 'Home Gnome'];
const STATUSES = ['Pitched', 'In Progress', 'Published'];

const viewModes = ['Week', 'Month', 'Quarter'];

// localStorage keys
const STORAGE_KEYS = {
  blockedDates: 'editorial-blocked-dates',
  hiddenEvents: 'editorial-hidden-events',
  eventOverrides: 'editorial-event-overrides',
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

export default function ContentCalendar({ stories = [], addStory, updateStory, deleteStory }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('Month');
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [newStory, setNewStory] = useState({
    title: '',
    brand: 'LawnStarter',
    status: 'Pitched',
    pitchDate: format(new Date(), 'yyyy-MM-dd'),
    publishDate: '',
    assignee: '',
    priority: 'Medium',
    notes: '',
  });

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

  // Combine all events
  const allEvents = useMemo(() => {
    const events = [];

    // Add stories (shown on publish date or pitch date if no publish date)
    stories.forEach((story) => {
      const displayDate = story.publishDate || story.pitchDate;
      if (displayDate) {
        events.push({
          ...story,
          date: displayDate,
          displayType: 'story',
        });
      }
    });

    // Add OOO
    sampleOOO.forEach((ooo) => {
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
  }, [stories, customBlockedDates, hiddenEvents, eventOverrides]);

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

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    if (event.displayType === 'story') {
      // Find the full story data
      const fullStory = stories.find((s) => s.id === event.id);
      setSelectedStory(fullStory);
    } else if (['blocked', 'highTraffic', 'holiday'].includes(event.displayType)) {
      // Open edit modal for blocked dates and high traffic events
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  };

  // Handle adding a new story
  const handleAddStory = () => {
    if (!newStory.title.trim()) return;

    addStory({
      title: newStory.title,
      brand: newStory.brand,
      status: newStory.status,
      pitchDate: newStory.pitchDate,
      publishDate: newStory.publishDate || null,
      assignee: newStory.assignee,
      priority: newStory.priority,
      notes: newStory.notes,
      dueDate: newStory.publishDate || newStory.pitchDate,
      metrics: {
        linkCount: null,
        ctr: null,
        googleImpressions: null,
        googlePosition: null,
        domainAuthority: null,
        pageviews: null,
        currentWords: 0,
        targetWords: 1500,
      },
      feedbackNotes: '',
    });

    // Reset form and close modal
    setNewStory({
      title: '',
      brand: 'LawnStarter',
      status: 'Pitched',
      pitchDate: format(new Date(), 'yyyy-MM-dd'),
      publishDate: '',
      assignee: '',
      priority: 'Medium',
      notes: '',
    });
    setShowAddStoryModal(false);
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

      {/* Event Edit Modal */}
      <EventEditModal />

      {/* Add Story Modal */}
      {showAddStoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddStoryModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-ls-green rounded-t-xl">
              <h3 className="text-lg font-semibold text-white">Add New Story</h3>
              <button
                onClick={() => setShowAddStoryModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story Title *</label>
                <input
                  type="text"
                  value={newStory.title}
                  onChange={(e) => setNewStory(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                  placeholder="Enter story title"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                <select
                  value={newStory.brand}
                  onChange={(e) => setNewStory(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                >
                  {BRANDS.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={newStory.status}
                  onChange={(e) => setNewStory(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                >
                  {STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Pitch Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pitch Date *</label>
                <input
                  type="date"
                  value={newStory.pitchDate}
                  onChange={(e) => setNewStory(prev => ({ ...prev, pitchDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                />
              </div>

              {/* Publish Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Publish Date (optional)</label>
                <input
                  type="date"
                  value={newStory.publishDate}
                  onChange={(e) => setNewStory(prev => ({ ...prev, publishDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <input
                  type="text"
                  value={newStory.assignee}
                  onChange={(e) => setNewStory(prev => ({ ...prev, assignee: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                  placeholder="Enter assignee name"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newStory.priority}
                  onChange={(e) => setNewStory(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newStory.notes}
                  onChange={(e) => setNewStory(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                  rows={3}
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowAddStoryModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStory}
                disabled={!newStory.title.trim()}
                className="px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Story
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
