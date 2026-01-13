import React, { useState, useMemo } from 'react';
import { highTrafficEvents2026, getEventsByDate } from '../data/highTrafficEvents';

// Unified Calendar showing all events, holidays, OOO, and content
export default function UnifiedCalendar({
  holidays,
  oooEntries,
  contentEntries,
  customEvents
}) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Start at Jan 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to check if a date falls within an OOO range
  const getOOOForDate = (dateStr) => {
    return oooEntries.filter(entry => {
      return dateStr >= entry.startDate && dateStr <= entry.endDate;
    });
  };

  // Helper to get content for a date
  const getContentForDate = (dateStr) => {
    return contentEntries.filter(entry => entry.dueDate === dateStr);
  };

  // Helper to get custom events for a date
  const getCustomEventsForDate = (dateStr) => {
    return customEvents.filter(event => event.date === dateStr);
  };

  // Helper to get holiday for a date
  const getHolidayForDate = (dateStr) => {
    return holidays.find(h => h.date === dateStr);
  };

  // Get all info for a specific date
  const getDateInfo = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const holiday = getHolidayForDate(dateStr);
    const preloadedEvents = getEventsByDate(dateStr);
    const ooo = getOOOForDate(dateStr);
    const content = getContentForDate(dateStr);
    const custom = getCustomEventsForDate(dateStr);

    // Determine if blocked
    const isBlocked = holiday ||
      preloadedEvents.some(e => e.type === 'blocked') ||
      custom.some(e => e.type === 'blocked');

    // Determine if high traffic
    const isHighTraffic = preloadedEvents.some(e => e.type === 'high_traffic') ||
      custom.some(e => e.type === 'high_traffic');

    return {
      dateStr,
      holiday,
      preloadedEvents,
      ooo,
      content,
      custom,
      isBlocked,
      isHighTraffic,
      hasEvents: holiday || preloadedEvents.length > 0 || ooo.length > 0 ||
        content.length > 0 || custom.length > 0
    };
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        ...getDateInfo(day),
        key: day
      });
    }

    return days;
  }, [year, month, holidays, oooEntries, contentEntries, customEvents]);

  return (
    <div className="unified-calendar">
      <div className="calendar-header">
        <h2>Calendar</h2>
        <div className="calendar-nav">
          <button onClick={prevMonth} className="btn btn-secondary">
            ← Prev
          </button>
          <span className="current-month">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="btn btn-secondary">
            Next →
          </button>
          <button onClick={goToToday} className="btn btn-small btn-secondary">
            Today
          </button>
        </div>
      </div>

      <div className="calendar-legend">
        <span className="legend-item">
          <span className="legend-color blocked"></span>
          Blocked Date
        </span>
        <span className="legend-item">
          <span className="legend-color high-traffic"></span>
          📺 High Traffic
        </span>
        <span className="legend-item">
          <span className="legend-color ooo"></span>
          OOO
        </span>
        <span className="legend-item">
          <span className="legend-color content"></span>
          Content Due
        </span>
      </div>

      <div className="calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {calendarDays.map(dayData => (
          dayData.empty ? (
            <div key={dayData.key} className="calendar-day empty"></div>
          ) : (
            <div
              key={dayData.key}
              className={`calendar-day ${dayData.isBlocked ? 'blocked' : ''} ${dayData.isHighTraffic && !dayData.isBlocked ? 'high-traffic' : ''}`}
            >
              <div className="day-number">{dayData.day}</div>

              <div className="day-events">
                {/* Holiday indicator */}
                {dayData.holiday && (
                  <div className="event-chip holiday" title={dayData.holiday.name}>
                    🚫 {dayData.holiday.name}
                  </div>
                )}

                {/* Preloaded events */}
                {dayData.preloadedEvents.slice(0, 2).map((event, idx) => (
                  <div
                    key={`preload-${idx}`}
                    className={`event-chip ${event.type}`}
                    title={`${event.name} (${event.category})`}
                  >
                    {event.type === 'high_traffic' ? '📺' : '🚫'} {event.name}
                  </div>
                ))}
                {dayData.preloadedEvents.length > 2 && (
                  <div className="event-chip more">
                    +{dayData.preloadedEvents.length - 2} more
                  </div>
                )}

                {/* Custom events */}
                {dayData.custom.map((event, idx) => (
                  <div
                    key={`custom-${idx}`}
                    className={`event-chip ${event.type}`}
                    title={event.name}
                  >
                    {event.type === 'blocked' ? '🚫' : '📺'} {event.name}
                  </div>
                ))}

                {/* OOO entries */}
                {dayData.ooo.map((entry, idx) => (
                  <div key={`ooo-${idx}`} className="event-chip ooo" title={`${entry.name} OOO`}>
                    🏖️ {entry.name}
                  </div>
                ))}

                {/* Content due */}
                {dayData.content.map((entry, idx) => (
                  <div key={`content-${idx}`} className="event-chip content" title={entry.title}>
                    📝 {entry.title}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
