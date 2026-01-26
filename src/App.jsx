import React, { useState } from 'react';
import { AppDataProvider } from './context/AppDataContext';
import Sidebar from './components/Sidebar';
import ContentCalendar from './components/ContentCalendar';
import RunningTotals from './components/RunningTotals';
import StoryArchive from './components/StoryArchive';
import StoryIdeation from './components/StoryIdeation';
import CompetitorLog from './components/CompetitorLog';
import Sources from './components/Sources';

function AppContent() {
  const [activeView, setActiveView] = useState('content-calendar');

  const renderView = () => {
    switch (activeView) {
      case 'content-calendar':
        return <ContentCalendar />;
      case 'running-totals':
        return <RunningTotals />;
      case 'story-archive':
        return <StoryArchive />;
      case 'story-ideation':
        return <StoryIdeation />;
      case 'competitor-log':
        return <CompetitorLog />;
      case 'sources':
        return <Sources />;
      default:
        return <ContentCalendar />;
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

function App() {
  return (
    <AppDataProvider>
      <AppContent />
    </AppDataProvider>
  );
}

export default App;
