import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Download, Calendar, Ban, X, Trash2, RefreshCw, Eye, EyeOff, AlertCircle, Bell, BellOff, FilePlus, ExternalLink, Loader2 } from 'lucide-react';
import { preloadedEvents, sampleStories, sampleOOO, sampleBlockedDates } from '../data/events';
import StoryDetailModal from './StoryDetailModal';
import { getStoredToken, fetchContentCalendarData, loadGoogleScript, authenticateWithGoogle } from '../utils/googleSheets';
import { fetchTeamOOOEvents, hasTeamCalendarsConfigured } from '../utils/googleCalendar';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  checkAndNotifyDeadlines,
  cleanupNotifiedDeadlines,
  getNotificationSettings,
  saveNotificationSettings,
} from '../utils/notifications';
import { getTemplates, hasTemplatesConfigured, copyTemplate } from '../utils/googleDrive';

const viewModes = ['Week', 'Month', 'Quarter'];

// localStorage keys
const STORAGE_KEYS = {
  blockedDates: 'editorial-blocked-dates',
  hiddenEvents: 'editorial-hidden-events',
  eventOverrides: 'editorial-event-overrides',
  customStories: 'editorial-custom-stories',
  customOOO: 'editorial-custom-ooo',
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

  // Modal states for adding new items
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [showAddOOOModal, setShowAddOOOModal] = useState(false);
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);
  const [showNewDraftModal, setShowNewDraftModal] = useState(false);
  const [newDraftLoading, setNewDraftLoading] = useState(false);
  const [newDraftResult, setNewDraftResult] = useState(null);
  const [newDraftError, setNewDraftError] = useState(null);

  // Persistent state for custom stories
  const [customStories, setCustomStories] = useState(() =>
    loadFromStorage(STORAGE_KEYS.customStories, [])
  );

  // Persistent state for custom OOO
  const [customOOO, setCustomOOO] = useState(() =>
    loadFromStorage(STORAGE_KEYS.customOOO, [])
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

  // Content Calendar Planning sheet data (approved stories - shown in green)
  const [contentCalendarData, setContentCalendarData] = useState([]);
  const [isLoadingContentCalendar, setIsLoadingContentCalendar] = useState(false);
  const [contentCalendarError, setContentCalendarError] = useState(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Google Calendar OOO data (team OOO - shown in orange)
  const [googleCalendarOOO, setGoogleCalendarOOO] = useState([]);
  const [isLoadingGoogleOOO, setIsLoadingGoogleOOO] = useState(false);
  const [googleOOOError, setGoogleOOOError] = useState(null);

  // Notification state
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const [notificationSettings, setNotificationSettings] = useState(() => getNotificationSettings());

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.customStories, customStories);
  }, [customStories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.customOOO, customOOO);
  }, [customOOO]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.blockedDates, customBlockedDates);
  }, [customBlockedDates]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.hiddenEvents, hiddenEvents);
  }, [hiddenEvents]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.eventOverrides, eventOverrides);
  }, [eventOverrides]);

  // Fetch Content Calendar Planning sheet data
  const fetchContentCalendar = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      // Try to authenticate if no token
      if (clientId) {
        try {
          await loadGoogleScript();
          const newToken = await authenticateWithGoogle(clientId);
          setIsLoadingContentCalendar(true);
          const data = await fetchContentCalendarData(newToken);
          setContentCalendarData(data);
          setContentCalendarError(null);
        } catch (err) {
          console.error('Auth error:', err);
          setContentCalendarError('Please sign in via Story & Pitch Analysis to load Content Calendar data.');
        } finally {
          setIsLoadingContentCalendar(false);
        }
      }
      return;
    }

    setIsLoadingContentCalendar(true);
    setContentCalendarError(null);
    try {
      const data = await fetchContentCalendarData(token);
      setContentCalendarData(data);
    } catch (err) {
      console.error('Content Calendar fetch error:', err);
      setContentCalendarError(err.message);
    } finally {
      setIsLoadingContentCalendar(false);
    }
  }, [clientId]);

  // Fetch Google Calendar OOO events
  const fetchGoogleOOO = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      // No token, can't fetch - user needs to sign in
      console.log('Google Calendar OOO: No token available');
      return;
    }

    if (!hasTeamCalendarsConfigured()) {
      // No calendars configured - show warning
      console.log('Google Calendar OOO: No team calendars configured (VITE_TEAM_CALENDAR_IDS not set)');
      setGoogleOOOError('Team calendars not configured. Set VITE_TEAM_CALENDAR_IDS.');
      return;
    }

    setIsLoadingGoogleOOO(true);
    setGoogleOOOError(null);

    try {
      // Calculate date range based on current view
      // Fetch a wide range to cover quarter view (6 months around current date)
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 3);
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 6);

      console.log('Google Calendar OOO: Fetching events from', timeMin, 'to', timeMax);
      const result = await fetchTeamOOOEvents(token, timeMin, timeMax);
      console.log('Google Calendar OOO: Result', result);

      if (result.events) {
        setGoogleCalendarOOO(result.events);
      }

      if (result.error) {
        console.warn('Some calendars had errors:', result.error);
        // Only show error if no events were fetched at all
        if (result.events.length === 0) {
          setGoogleOOOError('Unable to load team OOO dates. Check calendar permissions.');
        }
      }
    } catch (err) {
      console.error('Google Calendar OOO fetch error:', err);
      setGoogleOOOError('Unable to load team OOO dates. Check calendar permissions.');
    } finally {
      setIsLoadingGoogleOOO(false);
    }
  }, []);

  // Combined refresh function for both Content Calendar and Google OOO
  const handleRefreshAll = useCallback(() => {
    fetchContentCalendar();
    fetchGoogleOOO();
  }, [fetchContentCalendar, fetchGoogleOOO]);

  // Load Content Calendar data and OOO on mount
  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // Cleanup old notification records on mount
  useEffect(() => {
    cleanupNotifiedDeadlines();
  }, []);

  // Combine all events
  const allEvents = useMemo(() => {
    const events = [];

    // Add approved stories from Content Calendar Planning sheet (GREEN)
    // Sheet columns: Brand, Story Title, Pitch Date, News Peg, Analysis Due By, Edits Due By, QA Due By, Production Date, # Experts Contacted, Notes, Status, Study URL
    contentCalendarData.forEach((story) => {
      if (story.pitch_date && !hiddenEvents.includes(story.id)) {
        events.push({
          id: story.id,
          title: story.story_title || story.news_peg || story.brand || 'Approved Story',
          date: story.pitch_date,
          displayType: 'approvedStory',
          brand: story.brand,
          storyTitle: story.story_title,
          newsPeg: story.news_peg,
          analysisDueBy: story.analysis_due_by,
          editsDueBy: story.edits_due_by,
          qaDueBy: story.qa_due_by,
          productionDate: story.production_date,
          expertsContacted: story._experts_contacted,
          notes: story.notes,
          status: story.status,
          studyUrl: story.study_url,
        });
      }
    });

    // Add story ideation entries (YELLOW) - custom stories added via Add Story button
    customStories.forEach((story) => {
      if (!hiddenEvents.includes(story.id)) {
        events.push({
          ...story,
          date: story.pitchDate, // Use pitchDate instead of publishDate
          displayType: 'storyIdeation',
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

    // Add custom OOO
    customOOO.forEach((ooo) => {
      if (!hiddenEvents.includes(ooo.id)) {
        events.push({
          ...ooo,
          displayType: 'ooo',
        });
      }
    });

    // Add Google Calendar OOO events (from team calendars)
    googleCalendarOOO.forEach((ooo) => {
      if (!hiddenEvents.includes(ooo.id)) {
        events.push({
          ...ooo,
          displayType: 'ooo',
        });
      }
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
  }, [contentCalendarData, customStories, customOOO, googleCalendarOOO, customBlockedDates, hiddenEvents, eventOverrides]);

  // Handle notification permission request
  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      // Immediately check for deadlines after enabling
      checkAndNotifyDeadlines(allEvents);
    }
  };

  // Toggle notifications on/off
  const handleToggleNotifications = () => {
    const newSettings = { ...notificationSettings, enabled: !notificationSettings.enabled };
    setNotificationSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  // Check deadlines when events change (and notifications are enabled)
  useEffect(() => {
    if (notificationPermission === 'granted' && notificationSettings.enabled && allEvents.length > 0) {
      // Check deadlines immediately
      checkAndNotifyDeadlines(allEvents);

      // Also set up a periodic check every 30 minutes
      const interval = setInterval(() => {
        checkAndNotifyDeadlines(allEvents);
      }, 30 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [allEvents, notificationPermission, notificationSettings.enabled]);

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
      case 'approvedStory':
        return 'bg-ls-green text-white hover:bg-ls-green-light cursor-pointer';
      case 'storyIdeation':
        return 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300 cursor-pointer';
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
    if (event.displayType === 'approvedStory' || event.displayType === 'storyIdeation') {
      // Show story/ideation details
      setSelectedEvent(event);
      setShowEventModal(true);
    } else if (event.displayType === 'story') {
      // Find the full story data (legacy)
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

  // Add a new story ideation entry
  const handleAddStory = (storyData) => {
    const newStory = {
      id: `story-ideation-${Date.now()}`,
      ...storyData,
      type: 'storyIdeation',
    };
    setCustomStories(prev => [...prev, newStory]);
    setShowAddStoryModal(false);
  };

  // Add a new OOO
  const handleAddOOO = (oooData) => {
    const newOOO = {
      id: `custom-ooo-${Date.now()}`,
      ...oooData,
      type: 'ooo',
    };
    setCustomOOO(prev => [...prev, newOOO]);
    setShowAddOOOModal(false);
  };

  // Add a new blocked date
  const handleAddBlockedDate = (blockedData) => {
    const newBlocked = {
      id: `custom-blocked-${Date.now()}`,
      ...blockedData,
      type: blockedData.type || 'blocked',
    };
    setCustomBlockedDates(prev => [...prev, newBlocked]);
    setShowBlockDateModal(false);
  };

  // Export calendar to CSV
  const handleExportCSV = () => {
    const { start, end } = getDateRange();
    const eventsInRange = allEvents.filter(event => {
      const eventDate = parseISO(event.date);
      return eventDate >= start && eventDate <= end;
    });

    const csvContent = [
      ['Title', 'Date', 'End Date', 'Type', 'Category'].join(','),
      ...eventsInRange.map(event => [
        `"${event.title?.replace(/"/g, '""') || ''}"`,
        event.date,
        event.endDate || '',
        event.displayType || event.type || '',
        event.category || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `calendar-export-${format(currentDate, 'yyyy-MM')}.csv`;
    link.click();
  };

  // Create a new draft from a template
  const handleCreateNewDraft = async (templateId, brand, draftName) => {
    const token = getStoredToken();
    if (!token) {
      setNewDraftError('Please sign in first via Story & Pitch Analysis.');
      return;
    }

    setNewDraftLoading(true);
    setNewDraftError(null);
    setNewDraftResult(null);

    try {
      const result = await copyTemplate(token, templateId, draftName);
      setNewDraftResult({
        ...result,
        brand,
      });
    } catch (err) {
      console.error('Error creating draft:', err);
      setNewDraftError(err.message);
    } finally {
      setNewDraftLoading(false);
    }
  };

  // New Draft Modal
  const NewDraftModal = () => {
    const [draftName, setDraftName] = useState(`Study Story Draft - ${format(new Date(), 'MMM d, yyyy')}`);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const templates = getTemplates();

    if (!showNewDraftModal) return null;

    const handleClose = () => {
      setShowNewDraftModal(false);
      setNewDraftResult(null);
      setNewDraftError(null);
      setSelectedTemplate(null);
      setDraftName(`Study Story Draft - ${format(new Date(), 'MMM d, yyyy')}`);
    };

    const handleCreate = () => {
      if (selectedTemplate && draftName.trim()) {
        handleCreateNewDraft(selectedTemplate.id, selectedTemplate.brand, draftName);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">New Draft</h3>
              <p className="text-xs text-gray-500">Create a new study story from a template</p>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {newDraftResult ? (
              // Success state
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-ls-green-lighter rounded-full flex items-center justify-center mx-auto mb-4">
                  <FilePlus size={32} className="text-ls-green" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Draft Created!</h4>
                <p className="text-sm text-gray-600 mb-4">{newDraftResult.name}</p>
                <a
                  href={newDraftResult.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
                >
                  <ExternalLink size={18} />
                  Open in Google Docs
                </a>
              </div>
            ) : (
              // Form state
              <>
                {templates.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                    <p className="font-medium mb-1">No templates configured</p>
                    <p>Please set VITE_LAWNSTARTER_TEMPLATE_ID and/or VITE_LAWNLOVE_TEMPLATE_ID in your environment variables.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Template <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => setSelectedTemplate(template)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                              selectedTemplate?.id === template.id
                                ? 'border-ls-green bg-ls-green-lighter'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: template.color }}
                            />
                            <span className="font-medium text-gray-900">{template.brand} Template</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Draft Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                        placeholder="Enter draft name"
                      />
                    </div>

                    {newDraftError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                        {newDraftError}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!newDraftResult && templates.length > 0 && (
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={handleCreate}
                disabled={!selectedTemplate || !draftName.trim() || newDraftLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {newDraftLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FilePlus size={18} />
                    Create Draft
                  </>
                )}
              </button>
            </div>
          )}

          {newDraftResult && (
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add Story Ideation Modal
  const AddStoryModal = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [potentialMetrics, setPotentialMetrics] = useState('');
    const [newsPeg, setNewsPeg] = useState('');
    const [pitchDate, setPitchDate] = useState(format(currentDate, 'yyyy-MM-dd'));

    if (!showAddStoryModal) return null;

    const handleSubmit = () => {
      handleAddStory({
        title,
        description,
        potentialMetrics,
        newsPeg,
        pitchDate,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setPotentialMetrics('');
      setNewsPeg('');
      setPitchDate(format(currentDate, 'yyyy-MM-dd'));
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddStoryModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Add Story Ideation</h3>
              <p className="text-xs text-gray-500">Story ideas are shown in yellow on the calendar</p>
            </div>
            <button onClick={() => setShowAddStoryModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Story Idea / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Enter story idea or working title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="Describe the story concept..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Potential Metrics / Data Sources</label>
              <textarea
                value={potentialMetrics}
                onChange={e => setPotentialMetrics(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="What data or metrics could support this story?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">News Peg</label>
              <input
                type="text"
                value={newsPeg}
                onChange={e => setNewsPeg(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="What makes this timely? (holiday, event, trend...)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pitch Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={pitchDate}
                onChange={e => setPitchDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4 border-t bg-yellow-50 rounded-b-xl">
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !pitchDate}
              className="w-full px-4 py-2 bg-yellow-400 text-yellow-900 font-medium rounded-lg hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Story Ideation
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add OOO Modal
  const AddOOOModal = () => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(format(currentDate, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState('');

    if (!showAddOOOModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddOOOModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Add OOO</h3>
            <button onClick={() => setShowAddOOOModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name / Description</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
                placeholder="e.g., John - Vacation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            <button
              onClick={() => handleAddOOO({ title, date, endDate: endDate || undefined })}
              disabled={!title.trim()}
              className="w-full px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add OOO
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Block Date Modal
  const BlockDateModal = () => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(format(currentDate, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState('blocked');

    if (!showBlockDateModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlockDateModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Block Date</h3>
            <button onClick={() => setShowBlockDateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
                placeholder="e.g., Company event"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              >
                <option value="blocked">Blocked Date</option>
                <option value="highTraffic">High Traffic Day</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-orange focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            <button
              onClick={() => handleAddBlockedDate({ title, date, endDate: endDate || undefined, type })}
              disabled={!title.trim()}
              className="w-full px-4 py-2 bg-ls-orange text-white rounded-lg hover:bg-ls-orange-bright disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Block Date
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEvent = (event) => {
    const style = getEventStyle(event.displayType);
    const isClickable = ['approvedStory', 'storyIdeation', 'story', 'blocked', 'highTraffic', 'holiday'].includes(event.displayType);

    return (
      <div
        key={event.id}
        onClick={(e) => handleEventClick(event, e)}
        className={`
          text-xs px-2 py-1 rounded truncate mb-1 event-item
          ${style}
          ${isClickable ? 'cursor-pointer hover:opacity-90' : ''}
        `}
        title={`${event.title}${event.displayType === 'storyIdeation' ? ' (Story Ideation)' : event.displayType === 'approvedStory' ? ' (Approved)' : ''}`}
      >
        {event.title}
      </div>
    );
  };

  // Event Edit Modal
  const EventEditModal = () => {
    if (!showEventModal || !selectedEvent) return null;

    const isStoryIdeation = selectedEvent.displayType === 'storyIdeation';
    const isApprovedStory = selectedEvent.displayType === 'approvedStory';
    const isCustomEvent = selectedEvent.id?.startsWith('custom-') || selectedEvent.id?.startsWith('story-ideation-');
    const hasOverride = eventOverrides[selectedEvent.id];
    const canToggle = ['blocked', 'highTraffic'].includes(selectedEvent.displayType);

    // Story Ideation or Approved Story Modal
    if (isStoryIdeation || isApprovedStory) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEventModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${isApprovedStory ? 'bg-ls-green/5' : 'bg-yellow-50'}`}>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isApprovedStory ? 'Approved Story' : 'Story Ideation'}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isApprovedStory ? 'bg-ls-green text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                  {isApprovedStory ? 'From Content Calendar Sheet' : 'Under Consideration'}
                </span>
              </div>
              <button onClick={() => setShowEventModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {selectedEvent.brand && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <span
                    className="inline-block px-3 py-1 rounded-full text-white text-sm font-medium"
                    style={{
                      backgroundColor: selectedEvent.brand?.toLowerCase().includes('lawn love')
                        ? '#246227'
                        : selectedEvent.brand?.toLowerCase().includes('lawnstarter')
                          ? '#069C55'
                          : '#6b7280'
                    }}
                  >
                    {selectedEvent.brand}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story Title</label>
                <p className="text-gray-900 font-medium">{selectedEvent.storyTitle || selectedEvent.title || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pitch Date</label>
                <p className="text-gray-900">
                  {selectedEvent.date ? format(parseISO(selectedEvent.date), 'MMMM d, yyyy') : '-'}
                </p>
              </div>

              {selectedEvent.newsPeg && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">News Peg</label>
                  <p className="text-gray-600">{selectedEvent.newsPeg}</p>
                </div>
              )}

              {/* Story Ideation specific fields */}
              {isStoryIdeation && (
                <>
                  {selectedEvent.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <p className="text-gray-600">{selectedEvent.description}</p>
                    </div>
                  )}
                  {selectedEvent.potentialMetrics && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Potential Metrics / Data Sources</label>
                      <p className="text-gray-600">{selectedEvent.potentialMetrics}</p>
                    </div>
                  )}
                </>
              )}

              {/* Approved Story specific fields */}
              {isApprovedStory && (
                <>
                  {selectedEvent.analysisDueBy && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Due By</label>
                      <p className="text-gray-900">{selectedEvent.analysisDueBy}</p>
                    </div>
                  )}
                  {selectedEvent.editsDueBy && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Edits Due By</label>
                      <p className="text-gray-900">{selectedEvent.editsDueBy}</p>
                    </div>
                  )}
                  {selectedEvent.qaDueBy && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">QA Due By</label>
                      <p className="text-gray-900">{selectedEvent.qaDueBy}</p>
                    </div>
                  )}
                  {selectedEvent.productionDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
                      <p className="text-gray-900">{selectedEvent.productionDate}</p>
                    </div>
                  )}
                  {selectedEvent.expertsContacted && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1"># Experts Responded</label>
                      <p className="text-gray-900">{selectedEvent.expertsContacted}</p>
                    </div>
                  )}
                  {selectedEvent.status && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          selectedEvent.status?.toLowerCase() === 'pitched'
                            ? 'bg-green-500 text-white'
                            : 'bg-yellow-400 text-yellow-900'
                        }`}
                      >
                        {selectedEvent.status}
                      </span>
                    </div>
                  )}
                  {selectedEvent.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <p className="text-gray-600">{selectedEvent.notes}</p>
                    </div>
                  )}
                  {selectedEvent.studyUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Study URL</label>
                      <a href={selectedEvent.studyUrl} target="_blank" rel="noopener noreferrer" className="text-ls-green hover:underline">
                        {selectedEvent.studyUrl}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className={`p-4 border-t rounded-b-xl ${isApprovedStory ? 'bg-gray-50' : 'bg-yellow-50'}`}>
              {isStoryIdeation && isCustomEvent && (
                <button
                  onClick={() => {
                    handleDeleteEvent(selectedEvent.id);
                    // Also remove from customStories
                    setCustomStories(prev => prev.filter(s => s.id !== selectedEvent.id));
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                  Delete Story Ideation
                </button>
              )}
              {isApprovedStory && (
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <EyeOff size={18} />
                  Hide from Calendar
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Default Event Edit Modal (blocked, highTraffic, holiday)
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
              onClick={handleRefreshAll}
              disabled={isLoadingContentCalendar || isLoadingGoogleOOO}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Refresh Content Calendar and Team OOO"
            >
              <RefreshCw size={18} className={isLoadingContentCalendar || isLoadingGoogleOOO ? 'animate-spin' : ''} />
              Refresh
            </button>
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
              <span className="text-sm text-gray-600">Approved Stories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-400"></div>
              <span className="text-sm text-gray-600">Story Ideation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-ls-orange"></div>
              <span className="text-sm text-gray-600">Team OOO / Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-ls-blue"></div>
              <span className="text-sm text-gray-600">High Traffic Days</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Debug info - shows data loading status */}
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Sheet: {contentCalendarData.length} rows | OOO: {googleCalendarOOO.length} events
          </div>
          {(isLoadingContentCalendar || isLoadingGoogleOOO) && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw size={14} className="animate-spin" />
              {isLoadingContentCalendar && isLoadingGoogleOOO ? 'Loading...' :
               isLoadingContentCalendar ? 'Loading calendar...' : 'Loading OOO...'}
            </div>
          )}
          {contentCalendarError && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle size={14} />
              {contentCalendarError.includes('sign in') ? 'Sign in for approved stories' : 'Sheet error'}
            </div>
          )}
          {googleOOOError && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle size={14} />
              {googleOOOError}
            </div>
          )}
          {hiddenCount > 0 && (
            <div className="text-sm text-gray-500">
              {hiddenCount} event{hiddenCount !== 1 ? 's' : ''} hidden
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-[#0AB463] border-b sticky top-0 z-10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-sm font-semibold text-white border-r border-white/20 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="flex-1">
          {weeks.map((week, weekIndex) => {
            // For Quarter view, check if we need to show a month header
            // Show month header if this week contains the 1st of a month (or first week of quarter)
            let monthHeader = null;
            if (viewMode === 'Quarter') {
              const firstDayOfWeek = week[0];
              const lastDayOfWeek = week[6];

              // Check if any day in this week is the 1st of a month
              const firstOfMonthInWeek = week.find(day => day.getDate() === 1);

              // Show header for first week of quarter or when a new month starts
              if (weekIndex === 0 || firstOfMonthInWeek) {
                // Use the first of month if found, otherwise use the dominant month in the week
                const monthToShow = firstOfMonthInWeek ||
                  (week.filter(d => d.getMonth() === lastDayOfWeek.getMonth()).length >= 4 ? lastDayOfWeek : firstDayOfWeek);

                monthHeader = (
                  <div className="bg-[#0AB463] border-b px-4 py-2">
                    <span className="text-sm font-semibold text-white">
                      {format(monthToShow, 'MMMM yyyy')}
                    </span>
                  </div>
                );
              }
            }

            return (
              <React.Fragment key={weekIndex}>
                {monthHeader}
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

      {/* Footer Actions */}
      <div className="bg-white border-t px-6 py-3 flex items-center justify-end gap-3">
        {hasTemplatesConfigured() && (
          <button
            onClick={() => setShowNewDraftModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-ls-green text-ls-green rounded-lg hover:bg-ls-green-lighter transition-colors"
            title="Create a new study story draft from a template"
          >
            <FilePlus size={18} />
            New Draft
          </button>
        )}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download size={18} />
          Export CSV
        </button>
        {/* Notification Toggle */}
        {isNotificationSupported() && (
          notificationPermission === 'granted' ? (
            <button
              onClick={handleToggleNotifications}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                notificationSettings.enabled
                  ? 'bg-ls-blue text-white hover:bg-blue-600'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title={notificationSettings.enabled ? 'Notifications enabled - click to disable' : 'Notifications disabled - click to enable'}
            >
              {notificationSettings.enabled ? <Bell size={18} /> : <BellOff size={18} />}
              {notificationSettings.enabled ? 'Alerts On' : 'Alerts Off'}
            </button>
          ) : notificationPermission !== 'denied' && (
            <button
              onClick={handleEnableNotifications}
              className="flex items-center gap-2 px-4 py-2 border border-ls-blue text-ls-blue rounded-lg hover:bg-ls-blue-light transition-colors"
              title="Enable deadline notifications"
            >
              <Bell size={18} />
              Enable Alerts
            </button>
          )
        )}
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
      <AddStoryModal />

      {/* Add OOO Modal */}
      <AddOOOModal />

      {/* Block Date Modal */}
      <BlockDateModal />

      {/* New Draft Modal */}
      <NewDraftModal />
    </div>
  );
}
