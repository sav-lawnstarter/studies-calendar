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

// Empty form template for new stories
const emptyStoryForm = {
  title: '',
  brand: 'LawnStarter',
  pitchDate: '',
  newsPeg: '',
  analysisDueBy: '',
  draftDueBy: '',
  editsDueBy: '',
  qaDueBy: '',
  productionDate: '',
  expertsContacted: '',
  notes: '',
  researchUrl: '',
  methodologyUrl: '',
  analysisUrl: '',
  publishedUrl: '',
};

const viewModes = ['Week', 'Month', 'Quarter'];

// localStorage keys
const STORAGE_KEYS = {
  blockedDates: 'editorial-blocked-dates',
  hiddenEvents: 'editorial-hidden-events',
  eventOverrides: 'editorial-event-overrides',
  stories: 'editorial-stories',
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
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [storyForm, setStoryForm] = useState({ ...emptyStoryForm });
  const [editingStoryId, setEditingStoryId] = useState(null);

  // Persistent state for stories
  const [stories, setStories] = useState(() =>
    loadFromStorage(STORAGE_KEYS.stories, [])
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
    saveToStorage(STORAGE_KEYS.stories, stories);
  }, [stories]);

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

    // Add stories (shown on pitch date)
    stories.forEach((story) => {
      events.push({
        ...story,
        date: story.pitchDate,
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

  // Story form handlers
  const handleStoryFormChange = (field, value) => {
    setStoryForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddStory = () => {
    setStoryForm({ ...emptyStoryForm });
    setEditingStoryId(null);
    setShowAddStoryModal(true);
  };

  const handleEditStory = (story) => {
    setStoryForm({
      title: story.title || '',
      brand: story.brand || 'LawnStarter',
      pitchDate: story.pitchDate || '',
      newsPeg: story.newsPeg || '',
      analysisDueBy: story.analysisDueBy || '',
      draftDueBy: story.draftDueBy || '',
      editsDueBy: story.editsDueBy || '',
      qaDueBy: story.qaDueBy || '',
      productionDate: story.productionDate || '',
      expertsContacted: story.expertsContacted || '',
      notes: story.notes || '',
      researchUrl: story.researchUrl || '',
      methodologyUrl: story.methodologyUrl || '',
      analysisUrl: story.analysisUrl || '',
      publishedUrl: story.publishedUrl || '',
    });
    setEditingStoryId(story.id);
    setSelectedStory(null);
    setShowAddStoryModal(true);
  };

  const handleSaveStory = () => {
    if (!storyForm.title.trim() || !storyForm.pitchDate) {
      alert('Please enter a story title and pitch date.');
      return;
    }

    if (editingStoryId) {
      // Update existing story
      setStories(prev => prev.map(s =>
        s.id === editingStoryId ? { ...s, ...storyForm } : s
      ));
    } else {
      // Add new story
      const newStory = {
        id: `story-${Date.now()}`,
        ...storyForm,
      };
      setStories(prev => [...prev, newStory]);
    }

    setShowAddStoryModal(false);
    setStoryForm({ ...emptyStoryForm });
    setEditingStoryId(null);
  };

  const handleDeleteStory = (storyId) => {
    if (window.confirm('Are you sure you want to delete this story?')) {
      setStories(prev => prev.filter(s => s.id !== storyId));
      setSelectedStory(null);
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
              onClick={handleAddStory}
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
          onEdit={() => handleEditStory(selectedStory)}
          onDelete={() => handleDeleteStory(selectedStory.id)}
        />
      )}

      {/* Event Edit Modal */}
      <EventEditModal />

      {/* Add/Edit Story Modal */}
      {showAddStoryModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddStoryModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-ls-green p-4 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingStoryId ? 'Edit Story' : 'Add New Story'}
              </h2>
              <button
                onClick={() => setShowAddStoryModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                {/* Story Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Story Title *
                  </label>
                  <input
                    type="text"
                    value={storyForm.title}
                    onChange={(e) => handleStoryFormChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="Enter story title"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    value={storyForm.brand}
                    onChange={(e) => handleStoryFormChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                  >
                    <option value="LawnStarter">LawnStarter</option>
                    <option value="Lawn Love">Lawn Love</option>
                    <option value="Home Gnome">Home Gnome</option>
                  </select>
                </div>

                {/* Pitch Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pitch Date *
                  </label>
                  <input
                    type="date"
                    value={storyForm.pitchDate}
                    onChange={(e) => handleStoryFormChange('pitchDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                  />
                </div>

                {/* News Peg/Holiday tie-in */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    News Peg/Holiday Tie-in
                  </label>
                  <input
                    type="text"
                    value={storyForm.newsPeg}
                    onChange={(e) => handleStoryFormChange('newsPeg', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="e.g., Spring Lawn Care Season, Earth Day"
                  />
                </div>

                {/* Due Dates Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Due Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Analysis Due By
                      </label>
                      <input
                        type="date"
                        value={storyForm.analysisDueBy}
                        onChange={(e) => handleStoryFormChange('analysisDueBy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Draft Due By
                      </label>
                      <input
                        type="date"
                        value={storyForm.draftDueBy}
                        onChange={(e) => handleStoryFormChange('draftDueBy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Edits Due By
                      </label>
                      <input
                        type="date"
                        value={storyForm.editsDueBy}
                        onChange={(e) => handleStoryFormChange('editsDueBy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        QA Due By
                      </label>
                      <input
                        type="date"
                        value={storyForm.qaDueBy}
                        onChange={(e) => handleStoryFormChange('qaDueBy', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Production Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Production Date
                  </label>
                  <input
                    type="date"
                    value={storyForm.productionDate}
                    onChange={(e) => handleStoryFormChange('productionDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                  />
                </div>

                {/* Number of Experts Contacted */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Experts Contacted
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={storyForm.expertsContacted}
                    onChange={(e) => handleStoryFormChange('expertsContacted', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                {/* Notes/Blockers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes/Blockers
                  </label>
                  <textarea
                    value={storyForm.notes}
                    onChange={(e) => handleStoryFormChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                    placeholder="Any notes or blockers for this story..."
                  />
                </div>

                {/* URLs Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">URLs</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Research URL
                      </label>
                      <input
                        type="url"
                        value={storyForm.researchUrl}
                        onChange={(e) => handleStoryFormChange('researchUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Methodology URL
                      </label>
                      <input
                        type="url"
                        value={storyForm.methodologyUrl}
                        onChange={(e) => handleStoryFormChange('methodologyUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Official Analysis URL
                      </label>
                      <input
                        type="url"
                        value={storyForm.analysisUrl}
                        onChange={(e) => handleStoryFormChange('analysisUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Published Story URL
                      </label>
                      <input
                        type="url"
                        value={storyForm.publishedUrl}
                        onChange={(e) => handleStoryFormChange('publishedUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowAddStoryModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStory}
                className="px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
              >
                {editingStoryId ? 'Save Changes' : 'Add Story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
