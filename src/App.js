import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StoryIdeation from './components/StoryIdeation';
import CompetitorLog from './components/CompetitorLog';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [storyIdeas, setStoryIdeas] = useState([]);
  const [competitorEntries, setCompetitorEntries] = useState([]);

  const addStoryIdea = (idea) => {
    setStoryIdeas([...storyIdeas, { ...idea, id: Date.now() }]);
  };

  const addCompetitorEntry = (entry) => {
    setCompetitorEntries([...competitorEntries, { ...entry, id: Date.now() }]);
  };

  const deleteCompetitorEntry = (id) => {
    setCompetitorEntries(competitorEntries.filter(entry => entry.id !== id));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'story-ideation':
        return <StoryIdeation ideas={storyIdeas} onAddIdea={addStoryIdea} />;
      case 'competitor-log':
        return (
          <CompetitorLog
            entries={competitorEntries}
            onAddEntry={addCompetitorEntry}
            onDeleteEntry={deleteCompetitorEntry}
          />
        );
      case 'dashboard':
      default:
        return <Dashboard storyIdeas={storyIdeas} competitorEntries={competitorEntries} />;
    }
  };

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
