import React from 'react';
import { Calendar, BarChart3, Archive, Users, FileText, ChevronRight } from 'lucide-react';

const navItems = [
  { id: 'content-calendar', label: 'Content Calendar', icon: Calendar },
  { id: 'running-totals', label: 'Running Totals', icon: BarChart3 },
  { id: 'story-archive', label: 'Story Archive', icon: Archive },
  { id: 'competitor-log', label: 'Competitor Log', icon: FileText },
  { id: 'team-members', label: 'Team Members', icon: Users },
];

export default function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className="w-64 bg-ls-green h-screen flex flex-col fixed left-0 top-0">
      {/* Logo and Branding */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <img
            src="/LawnStarter new logo.png"
            alt="LawnStarter"
            className="w-10 h-10 rounded-lg bg-white p-1"
          />
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">LawnStarter</h1>
            <p className="text-white/70 text-xs">Editorial Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 sidebar-scroll overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200 text-left
                    ${isActive
                      ? 'bg-white text-ls-green font-semibold shadow-lg'
                      : 'text-white hover:bg-white/10'
                    }
                  `}
                >
                  <Icon size={20} className={isActive ? 'text-ls-green' : 'text-white/80'} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={16} className="text-ls-green" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/20">
        <div className="bg-ls-green-dark rounded-lg p-3">
          <p className="text-white/80 text-xs mb-2">Content Stats</p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/10 rounded p-2">
              <p className="text-white font-bold text-lg">12</p>
              <p className="text-white/60 text-xs">In Progress</p>
            </div>
            <div className="bg-white/10 rounded p-2">
              <p className="text-white font-bold text-lg">47</p>
              <p className="text-white/60 text-xs">Published</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
