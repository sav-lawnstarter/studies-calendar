import React from 'react';
import { Mail, FileText, Calendar, Plus } from 'lucide-react';
import { teamMembers, sampleStories, sampleOOO } from '../data/events';

export default function TeamMembers() {
  const getTeamMemberStats = (memberName) => {
    const stories = sampleStories.filter((s) => s.assignee === memberName);
    const ooo = sampleOOO.filter((o) => o.person === memberName);
    return {
      totalStories: stories.length,
      published: stories.filter((s) => s.status === 'Published').length,
      inProgress: stories.filter((s) => s.status === 'In Progress').length,
      upcomingOOO: ooo.length,
    };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors">
          <Plus size={18} />
          Add Team Member
        </button>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member) => {
          const stats = getTeamMemberStats(member.name);

          return (
            <div
              key={member.id}
              className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="bg-ls-green p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-ls-green font-bold text-xl">
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{member.name}</h3>
                    <p className="text-white/80 text-sm">{member.role}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-ls-green">{stats.totalStories}</p>
                    <p className="text-xs text-gray-500">Total Stories</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                    <p className="text-xs text-gray-500">Published</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-ls-orange">{stats.inProgress}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-600">{stats.upcomingOOO}</p>
                    <p className="text-xs text-gray-500">Upcoming OOO</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Mail size={14} />
                  <a
                    href={`mailto:${member.email}`}
                    className="hover:text-ls-green transition-colors"
                  >
                    {member.email}
                  </a>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-ls-green transition-colors">
                  <FileText size={14} />
                  View Stories
                </button>
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-ls-green transition-colors">
                  <Calendar size={14} />
                  Schedule OOO
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Overview */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Workload Overview</h3>
        <div className="space-y-4">
          {teamMembers.slice(0, 4).map((member) => {
            const stats = getTeamMemberStats(member.name);
            const workload = stats.inProgress;
            const maxWorkload = 3;
            const percentage = Math.min(100, (workload / maxWorkload) * 100);

            return (
              <div key={member.id} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600">{member.name}</div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage > 80
                          ? 'bg-red-500'
                          : percentage > 50
                            ? 'bg-ls-orange'
                            : 'bg-ls-green'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-sm text-gray-500 text-right">
                  {stats.inProgress} active
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
