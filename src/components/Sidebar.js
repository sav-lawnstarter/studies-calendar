import React from 'react';

function Sidebar({ activeTab, onTabChange }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'story-ideation', label: 'Story Ideation', icon: '💡' },
    { id: 'competitor-log', label: 'Competitor Log', icon: '📋' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img
          src={process.env.PUBLIC_URL + '/LawnStarter_new_logo.png'}
          alt="LawnStarter Logo"
          className="sidebar-logo"
        />
        <span className="sidebar-title">LawnStarter Editorial Dashboard</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
