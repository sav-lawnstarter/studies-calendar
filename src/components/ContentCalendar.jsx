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
  startOfQuarter,
  endOfQuarter,
  addQuarters,
  subQuarters,
} from 'date-fns';
import { useAppData } from '../context/AppDataContext';
import StoryDetailModal from './StoryDetailModal';
import {
  CalendarHeader,
  CalendarLegend,
  CalendarGrid,
  EventEditModal,
  AddStoryModal,
  AddOOOModal,
  BlockDateModal,
} from './calendar';

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('Month');
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [showAddOOOModal, setShowAddOOOModal] = useState(false);
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);

  // Get data and actions from centralized context
  const {
    allEvents,
    stories,
    hiddenEvents,
    eventOverrides,
    addStory,
    addOOO,
    addBlockedDate,
    hideEvent,
    toggleEventType,
    resetEventOverride,
  } = useAppData();

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
  const weeks = useMemo(() => {
    const { start, end } = getDateRange();
    const days = [];
    let day = start;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weeksList = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksList.push(days.slice(i, i + 7));
    }

    return weeksList;
  }, [currentDate, viewMode]);

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

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    if (event.displayType === 'story') {
      // Find the full story data
      const fullStory = stories.find((s) => s.id === event.id);
      setSelectedStory(fullStory || event);
    } else if (['blocked', 'highTraffic', 'holiday'].includes(event.displayType)) {
      // Open edit modal for blocked dates and high traffic events
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  };

  // Delete/hide an event
  const handleDeleteEvent = (eventId) => {
    hideEvent(eventId);
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  // Toggle event type between blocked and highTraffic
  const handleToggleEventType = (eventId, currentType) => {
    const newType = toggleEventType(eventId, currentType);
    // Update selected event to reflect the change
    setSelectedEvent((prev) =>
      prev ? { ...prev, type: newType, displayType: newType } : null
    );
  };

  // Reset event overrides
  const handleResetEvent = (eventId) => {
    resetEventOverride(eventId);
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  // Handle adding a new story
  const handleAddStory = (storyData) => {
    addStory(storyData);
  };

  // Handle adding OOO
  const handleAddOOO = (oooData) => {
    addOOO(oooData);
  };

  // Handle blocking a date
  const handleBlockDate = (blockedData) => {
    addBlockedDate(blockedData);
  };

  // Export to CSV
  const handleExport = () => {
    const csvRows = [
      ['Title', 'Date', 'End Date', 'Type', 'Category'],
      ...allEvents.map((event) => [
        event.title,
        event.date,
        event.endDate || '',
        event.displayType,
        event.category || '',
      ]),
    ];

    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `editorial-calendar-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Count hidden events
  const hiddenCount = hiddenEvents.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <CalendarHeader
        title={getTitle()}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={navigatePrev}
        onNext={navigateNext}
        onToday={goToToday}
        onAddStory={() => setShowAddStoryModal(true)}
        onAddOOO={() => setShowAddOOOModal(true)}
        onBlockDate={() => setShowBlockDateModal(true)}
        onExport={handleExport}
      />

      {/* Legend */}
      <CalendarLegend hiddenCount={hiddenCount} />

      {/* Calendar Grid */}
      <CalendarGrid
        weeks={weeks}
        currentDate={currentDate}
        viewMode={viewMode}
        allEvents={allEvents}
        onEventClick={handleEventClick}
      />

      {/* Story Detail Modal */}
      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}

      {/* Event Edit Modal */}
      <EventEditModal
        event={selectedEvent}
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        onDelete={handleDeleteEvent}
        onToggleType={handleToggleEventType}
        onReset={handleResetEvent}
        eventOverrides={eventOverrides}
      />

      {/* Add Story Modal */}
      <AddStoryModal
        isOpen={showAddStoryModal}
        onClose={() => setShowAddStoryModal(false)}
        onSave={handleAddStory}
      />

      {/* Add OOO Modal */}
      <AddOOOModal
        isOpen={showAddOOOModal}
        onClose={() => setShowAddOOOModal(false)}
        onSave={handleAddOOO}
      />

      {/* Block Date Modal */}
      <BlockDateModal
        isOpen={showBlockDateModal}
        onClose={() => setShowBlockDateModal(false)}
        onSave={handleBlockDate}
      />
    </div>
  );
}
