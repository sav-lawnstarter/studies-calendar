import React from 'react';
import { Calendar, BarChart3, Archive, FileText, Lightbulb, ChevronRight, PieChart, Clock, TrendingUp, FileWarning } from 'lucide-react';

const navItems = [
  { id: 'content-calendar', label: 'Content Calendar', icon: Calendar },
  { id: 'due-this-week', label: 'Due This Week', icon: Clock },
  { id: 'missing-prs', label: 'Missing PRs', icon: FileWarning },
  { id: 'running-totals', label: 'Running Totals', icon: BarChart3 },
  { id: 'story-pitch-analysis', label: 'Story & Pitch Analysis', icon: PieChart },
  { id: 'competitor-log', label: 'Competitor Log', icon: FileText },
  { id: 'trending-topics', label: 'Trending Topics', icon: TrendingUp },
  { id: 'story-ideation', label: 'Story Ideation', icon: Lightbulb },
  { id: 'story-archive', label: 'Story Archive', icon: Archive },
];

export default function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className="w-64 bg-ls-green h-screen flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-4 border-b border-white/20">
        <img
          src="/LawnStarter_new_logo.png"
          alt="LawnStarter"
          className="h-12"
        />
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
          <p className="text-white/80 text-xs mb-2">Editorial Dashboard</p>
          <p className="text-white/60 text-xs text-center">
            Add stories to see stats
          </p>
        </div>
      </div>
    </aside>
  );
}
