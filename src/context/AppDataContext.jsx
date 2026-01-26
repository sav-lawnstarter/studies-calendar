import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { preloadedEvents } from '../data/events';

// localStorage keys
const STORAGE_KEYS = {
  stories: 'editorial-stories',
  oooEntries: 'editorial-ooo-entries',
  blockedDates: 'editorial-blocked-dates',
  hiddenEvents: 'editorial-hidden-events',
  eventOverrides: 'editorial-event-overrides',
  ideas: 'editorial-ideas',
  competitors: 'editorial-competitors',
  sources: 'editorial-sources',
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

// Create the context
const AppDataContext = createContext(null);

// Provider component
export function AppDataProvider({ children }) {
  // Stories
  const [stories, setStories] = useState(() => loadFromStorage(STORAGE_KEYS.stories, []));

  // OOO Entries
  const [oooEntries, setOooEntries] = useState(() => loadFromStorage(STORAGE_KEYS.oooEntries, []));

  // Custom blocked dates
  const [customBlockedDates, setCustomBlockedDates] = useState(() =>
    loadFromStorage(STORAGE_KEYS.blockedDates, [])
  );

  // Hidden events (deleted events)
  const [hiddenEvents, setHiddenEvents] = useState(() =>
    loadFromStorage(STORAGE_KEYS.hiddenEvents, [])
  );

  // Event type overrides (toggled between blocked/highTraffic)
  const [eventOverrides, setEventOverrides] = useState(() =>
    loadFromStorage(STORAGE_KEYS.eventOverrides, {})
  );

  // Story ideas
  const [ideas, setIdeas] = useState(() => loadFromStorage(STORAGE_KEYS.ideas, []));

  // Competitor log entries
  const [competitors, setCompetitors] = useState(() =>
    loadFromStorage(STORAGE_KEYS.competitors, [])
  );

  // Sources
  const [sources, setSources] = useState(() => loadFromStorage(STORAGE_KEYS.sources, []));

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.stories, stories);
  }, [stories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.oooEntries, oooEntries);
  }, [oooEntries]);

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
    saveToStorage(STORAGE_KEYS.ideas, ideas);
  }, [ideas]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.competitors, competitors);
  }, [competitors]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.sources, sources);
  }, [sources]);

  // Combine all events for calendar display
  const allEvents = useMemo(() => {
    const events = [];

    // Add stories (shown on publish date)
    stories.forEach((story) => {
      events.push({
        ...story,
        date: story.publishDate,
        displayType: 'story',
      });
    });

    // Add OOO entries
    oooEntries.forEach((ooo) => {
      if (!hiddenEvents.includes(ooo.id)) {
        events.push({
          ...ooo,
          displayType: 'ooo',
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
  }, [stories, oooEntries, customBlockedDates, hiddenEvents, eventOverrides]);

  // Story CRUD operations
  const addStory = (story) => {
    const newStory = {
      ...story,
      id: `story-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStories((prev) => [...prev, newStory]);
    return newStory;
  };

  const updateStory = (id, updates) => {
    setStories((prev) =>
      prev.map((story) => (story.id === id ? { ...story, ...updates } : story))
    );
  };

  const deleteStory = (id) => {
    setStories((prev) => prev.filter((story) => story.id !== id));
  };

  // OOO CRUD operations
  const addOOO = (ooo) => {
    const newOOO = {
      ...ooo,
      id: `ooo-${Date.now()}`,
      type: 'ooo',
    };
    setOooEntries((prev) => [...prev, newOOO]);
    return newOOO;
  };

  const updateOOO = (id, updates) => {
    setOooEntries((prev) =>
      prev.map((ooo) => (ooo.id === id ? { ...ooo, ...updates } : ooo))
    );
  };

  const deleteOOO = (id) => {
    setOooEntries((prev) => prev.filter((ooo) => ooo.id !== id));
  };

  // Blocked date operations
  const addBlockedDate = (blocked) => {
    const newBlocked = {
      ...blocked,
      id: `custom-blocked-${Date.now()}`,
      type: blocked.type || 'blocked',
    };
    setCustomBlockedDates((prev) => [...prev, newBlocked]);
    return newBlocked;
  };

  const deleteBlockedDate = (id) => {
    setCustomBlockedDates((prev) => prev.filter((b) => b.id !== id));
  };

  // Event visibility operations
  const hideEvent = (eventId) => {
    setHiddenEvents((prev) => [...prev, eventId]);
  };

  const restoreEvent = (eventId) => {
    setHiddenEvents((prev) => prev.filter((id) => id !== eventId));
  };

  // Event type override operations
  const toggleEventType = (eventId, currentType) => {
    const newType =
      currentType === 'blocked'
        ? 'highTraffic'
        : currentType === 'highTraffic'
        ? 'blocked'
        : currentType;

    setEventOverrides((prev) => ({
      ...prev,
      [eventId]: { type: newType },
    }));

    return newType;
  };

  const resetEventOverride = (eventId) => {
    setEventOverrides((prev) => {
      const newOverrides = { ...prev };
      delete newOverrides[eventId];
      return newOverrides;
    });
    setHiddenEvents((prev) => prev.filter((id) => id !== eventId));
  };

  // Ideas CRUD operations
  const addIdea = (idea) => {
    const newIdea = {
      ...idea,
      id: `idea-${Date.now()}`,
      createdAt: new Date().toLocaleDateString(),
    };
    setIdeas((prev) => [newIdea, ...prev]);
    return newIdea;
  };

  const updateIdea = (id, updates) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, ...updates } : idea))
    );
  };

  const deleteIdea = (id) => {
    setIdeas((prev) => prev.filter((idea) => idea.id !== id));
  };

  // Competitor CRUD operations
  const addCompetitor = (competitor) => {
    const newCompetitor = {
      ...competitor,
      id: `competitor-${Date.now()}`,
      date: competitor.date || new Date().toLocaleDateString(),
    };
    setCompetitors((prev) => [newCompetitor, ...prev]);
    return newCompetitor;
  };

  const updateCompetitor = (id, updates) => {
    setCompetitors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const deleteCompetitor = (id) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  };

  // Sources CRUD operations
  const addSource = (source) => {
    const newSource = {
      ...source,
      id: `source-${Date.now()}`,
      addedAt: new Date().toLocaleDateString(),
    };
    setSources((prev) => [newSource, ...prev]);
    return newSource;
  };

  const updateSource = (id, updates) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const value = {
    // Data
    stories,
    oooEntries,
    customBlockedDates,
    hiddenEvents,
    eventOverrides,
    ideas,
    competitors,
    sources,
    allEvents,

    // Story operations
    addStory,
    updateStory,
    deleteStory,

    // OOO operations
    addOOO,
    updateOOO,
    deleteOOO,

    // Blocked date operations
    addBlockedDate,
    deleteBlockedDate,

    // Event visibility operations
    hideEvent,
    restoreEvent,
    toggleEventType,
    resetEventOverride,

    // Ideas operations
    addIdea,
    updateIdea,
    deleteIdea,

    // Competitor operations
    addCompetitor,
    updateCompetitor,
    deleteCompetitor,

    // Sources operations
    addSource,
    updateSource,
    deleteSource,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// Custom hook to use the context
export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}

export default AppDataContext;
