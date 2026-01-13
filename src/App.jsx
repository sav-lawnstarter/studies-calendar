import React, { useState, useEffect } from 'react';
import { useHolidays } from './hooks/useHolidays';
import OOOTracker from './components/OOOTracker';
import ContentCalendar from './components/ContentCalendar';
import StoryArchive from './components/StoryArchive';
import UnifiedCalendar from './components/UnifiedCalendar';
import EventManager from './components/EventManager';

// Local storage keys
const STORAGE_KEYS = {
  OOO: 'editorial-dashboard-ooo',
  CONTENT: 'editorial-dashboard-content',
  STORIES: 'editorial-dashboard-stories',
  CUSTOM_EVENTS: 'editorial-dashboard-events'
};

// Helper to load from localStorage
const loadFromStorage = (key, defaultValue = []) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Helper to save to localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');

  // State for all data - initialized from localStorage
  const [oooEntries, setOooEntries] = useState(() => loadFromStorage(STORAGE_KEYS.OOO));
  const [contentEntries, setContentEntries] = useState(() => loadFromStorage(STORAGE_KEYS.CONTENT));
  const [stories, setStories] = useState(() => loadFromStorage(STORAGE_KEYS.STORIES));
  const [customEvents, setCustomEvents] = useState(() => loadFromStorage(STORAGE_KEYS.CUSTOM_EVENTS));

  // Fetch holidays from Nager.Date API
  const { holidays, loading: holidaysLoading, error: holidaysError } = useHolidays(2026);

  // Persist data to localStorage when it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OOO, oooEntries);
  }, [oooEntries]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONTENT, contentEntries);
  }, [contentEntries]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STORIES, stories);
  }, [stories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CUSTOM_EVENTS, customEvents);
  }, [customEvents]);

  const tabs = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'ooo', label: 'OOO Tracker' },
    { id: 'content', label: 'Content Calendar' },
    { id: 'archive', label: 'Story Archive' },
    { id: 'events', label: 'Custom Events' }
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Editorial Dashboard</h1>
          {holidaysLoading && <span className="loading-indicator">Loading holidays...</span>}
          {holidaysError && <span className="error-indicator">⚠️ Holiday API unavailable</span>}
        </div>
      </header>

      <nav className="app-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'calendar' && (
          <UnifiedCalendar
            holidays={holidays}
            oooEntries={oooEntries}
            contentEntries={contentEntries}
            customEvents={customEvents}
          />
        )}

        {activeTab === 'ooo' && (
          <OOOTracker
            oooEntries={oooEntries}
            setOooEntries={setOooEntries}
          />
        )}

        {activeTab === 'content' && (
          <ContentCalendar
            entries={contentEntries}
            setEntries={setContentEntries}
          />
        )}

        {activeTab === 'archive' && (
          <StoryArchive
            stories={stories}
            setStories={setStories}
          />
        )}

        {activeTab === 'events' && (
          <EventManager
            customEvents={customEvents}
            setCustomEvents={setCustomEvents}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Editorial Dashboard © 2026 | Holidays via <a href="https://date.nager.at" target="_blank" rel="noopener noreferrer">Nager.Date API</a></p>
      </footer>
    </div>
  );
}
