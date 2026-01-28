// Google Calendar API utility for fetching team OOO events

// Get team calendar IDs from environment variable
// VITE_TEAM_CALENDAR_IDS should contain comma-separated email addresses
const getTeamCalendarIds = () => {
  const envValue = import.meta.env.VITE_TEAM_CALENDAR_IDS || '';
  return envValue.split(',').map(email => email.trim()).filter(email => email);
};

// Extract first name from OOO event title
// Pattern: Any text followed by "OOO" - extract the person's name from the beginning
// Examples: "Sav Williams OOO", "John Smith OOO", "Jane Doe OOO - Vacation"
const extractFirstName = (title) => {
  if (!title) return 'Unknown';

  // Match everything before "OOO" (case insensitive)
  const match = title.match(/^(.+?)\s*OOO/i);
  if (match && match[1]) {
    const fullName = match[1].trim();
    // Get just the first name (first word)
    const firstName = fullName.split(/\s+/)[0];
    return firstName || 'Unknown';
  }

  return 'Unknown';
};

// Check if event title contains "OOO" (case insensitive)
const isOOOEvent = (title) => {
  if (!title) return false;
  return /OOO/i.test(title);
};

// Fetch OOO events from a single calendar
const fetchCalendarOOOEvents = async (accessToken, calendarId, timeMin, timeMax) => {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    maxResults: '250',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Calendar not found or no access: ${calendarId}`);
        return [];
      }
      if (response.status === 403) {
        console.warn(`Access denied to calendar: ${calendarId}`);
        return [];
      }
      throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.items || [];

    // Filter for OOO events only
    return events
      .filter(event => isOOOEvent(event.summary))
      .map(event => {
        const firstName = extractFirstName(event.summary);

        // Handle all-day events vs timed events
        let startDate, endDate;
        if (event.start.date) {
          // All-day event
          startDate = event.start.date;
          // For all-day events, Google returns end date as exclusive (day after)
          // So we subtract one day to get the actual end date
          const endDateObj = new Date(event.end.date);
          endDateObj.setDate(endDateObj.getDate() - 1);
          endDate = endDateObj.toISOString().split('T')[0];
        } else {
          // Timed event - just use the date portion
          startDate = event.start.dateTime.split('T')[0];
          endDate = event.end.dateTime.split('T')[0];
        }

        return {
          id: `gcal-ooo-${event.id}`,
          title: `${firstName} OOO`,
          date: startDate,
          endDate: startDate !== endDate ? endDate : undefined,
          displayType: 'ooo',
          calendarId: calendarId,
          originalTitle: event.summary,
          isGoogleCalendarOOO: true,
        };
      });
  } catch (error) {
    console.error(`Error fetching OOO from calendar ${calendarId}:`, error);
    return [];
  }
};

// Fetch OOO events from all team calendars
export const fetchTeamOOOEvents = async (accessToken, timeMin, timeMax) => {
  const calendarIds = getTeamCalendarIds();

  if (calendarIds.length === 0) {
    console.warn('No team calendar IDs configured. Set VITE_TEAM_CALENDAR_IDS environment variable.');
    return { events: [], error: null, hasCalendars: false };
  }

  const allEvents = [];
  const errors = [];

  // Fetch from all calendars in parallel
  const results = await Promise.allSettled(
    calendarIds.map(calendarId =>
      fetchCalendarOOOEvents(accessToken, calendarId, timeMin, timeMax)
    )
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    } else {
      errors.push(`Calendar ${calendarIds[index]}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  // Deduplicate events by ID
  const uniqueEvents = Array.from(
    new Map(allEvents.map(event => [event.id, event])).values()
  );

  return {
    events: uniqueEvents,
    error: errors.length > 0 ? errors.join('; ') : null,
    hasCalendars: true,
    calendarCount: calendarIds.length,
    fetchedCount: uniqueEvents.length,
  };
};

// Export helper for checking if calendars are configured
export const hasTeamCalendarsConfigured = () => {
  return getTeamCalendarIds().length > 0;
};
