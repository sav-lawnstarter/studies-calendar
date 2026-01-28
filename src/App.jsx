import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ContentCalendar from './components/ContentCalendar';
import RunningTotals from './components/RunningTotals';
import StoryArchive from './components/StoryArchive';
import StoryIdeation from './components/StoryIdeation';
import StoryPitchAnalysis from './components/StoryPitchAnalysis';
import CompetitorLog from './components/CompetitorLog';
import DueThisWeek from './components/DueThisWeek';

function App() {
  const [activeView, setActiveView] = useState('content-calendar');

  const renderView = () => {
    switch (activeView) {
      case 'content-calendar':
        return <ContentCalendar />;
      case 'due-this-week':
        return <DueThisWeek />;
      case 'running-totals':
        return <RunningTotals />;
      case 'story-archive':
        return <StoryArchive />;
      case 'story-ideation':
        return <StoryIdeation />;
      case 'story-pitch-analysis':
        return <StoryPitchAnalysis />;
      case 'competitor-log':
        return <CompetitorLog />;
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

export default App;
