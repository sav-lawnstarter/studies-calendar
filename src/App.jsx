import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ContentCalendar from './components/ContentCalendar';
import RunningTotals from './components/RunningTotals';
import StoryArchive from './components/StoryArchive';
import CompetitorLog from './components/CompetitorLog';
import TeamMembers from './components/TeamMembers';

function App() {
  const [activeView, setActiveView] = useState('content-calendar');

  const renderView = () => {
    switch (activeView) {
      case 'content-calendar':
        return <ContentCalendar />;
      case 'running-totals':
        return <RunningTotals />;
      case 'story-archive':
        return <StoryArchive />;
      case 'competitor-log':
        return <CompetitorLog />;
      case 'team-members':
        return <TeamMembers />;
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
