import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ContentCalendar from './components/ContentCalendar';
import RunningTotals from './components/RunningTotals';
import StoryArchive from './components/StoryArchive';
import StoryIdeation from './components/StoryIdeation';
import CompetitorLog from './components/CompetitorLog';

const STORIES_STORAGE_KEY = 'editorial-stories';

// Load stories from localStorage
const loadStoriesFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save stories to localStorage
const saveStoriesToStorage = (stories) => {
  try {
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
  } catch (e) {
    console.error('Failed to save stories:', e);
  }
};

function App() {
  const [activeView, setActiveView] = useState('content-calendar');
  const [stories, setStories] = useState(() => loadStoriesFromStorage());

  // Persist stories to localStorage whenever they change
  useEffect(() => {
    saveStoriesToStorage(stories);
  }, [stories]);

  // Add a new story
  const addStory = useCallback((story) => {
    const newStory = {
      ...story,
      id: `story-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStories(prev => [...prev, newStory]);
    return newStory;
  }, []);

  // Update an existing story
  const updateStory = useCallback((storyId, updates) => {
    setStories(prev => prev.map(story =>
      story.id === storyId ? { ...story, ...updates, updatedAt: new Date().toISOString() } : story
    ));
  }, []);

  // Delete a story
  const deleteStory = useCallback((storyId) => {
    setStories(prev => prev.filter(story => story.id !== storyId));
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'content-calendar':
        return <ContentCalendar stories={stories} addStory={addStory} updateStory={updateStory} deleteStory={deleteStory} />;
      case 'running-totals':
        return <RunningTotals stories={stories} />;
      case 'story-archive':
        return <StoryArchive stories={stories} updateStory={updateStory} deleteStory={deleteStory} />;
      case 'story-ideation':
        return <StoryIdeation />;
      case 'competitor-log':
        return <CompetitorLog />;
      default:
        return <ContentCalendar stories={stories} addStory={addStory} updateStory={updateStory} deleteStory={deleteStory} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Green Sidebar */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
