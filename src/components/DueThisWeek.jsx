import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle, Calendar, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { getStoredToken, fetchContentCalendarData, loadGoogleScript, authenticateWithGoogle } from '../utils/googleSheets';

// Deadline types with their labels and colors
const DEADLINE_TYPES = [
  { field: 'pitch_date', label: 'Pitch Date', color: 'bg-ls-green', textColor: 'text-white' },
  { field: 'analysis_due_by', label: 'Analysis Due', color: 'bg-purple-500', textColor: 'text-white' },
  { field: 'edits_due_by', label: 'Edits Due', color: 'bg-blue-500', textColor: 'text-white' },
  { field: 'qa_due_by', label: 'QA Due', color: 'bg-orange-500', textColor: 'text-white' },
  { field: 'production_date', label: 'Production', color: 'bg-red-500', textColor: 'text-white' },
];

// Convert date string to Date object
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  // Check if it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }

  // Handle MM/DD/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return new Date(year, parseInt(month) - 1, parseInt(day));
  }

  return null;
};

export default function DueThisWeek() {
  const [contentCalendarData, setContentCalendarData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedStories, setExpandedStories] = useState({});
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Fetch Content Calendar data
  const fetchData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      if (clientId) {
        try {
          await loadGoogleScript();
          const newToken = await authenticateWithGoogle(clientId);
          setIsLoading(true);
          const data = await fetchContentCalendarData(newToken);
          setContentCalendarData(data);
          setError(null);
        } catch (err) {
          console.error('Auth error:', err);
          setError('Please sign in via Story & Pitch Analysis to load data.');
        } finally {
          setIsLoading(false);
        }
      } else {
        setError('Google Client ID not configured.');
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchContentCalendarData(token);
      setContentCalendarData(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate this week's date range
  const weekRange = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });
    return { start, end, today };
  }, []);

  // Find all deadlines due this week
  const deadlinesThisWeek = useMemo(() => {
    const deadlines = [];
    const { start, end, today } = weekRange;

    contentCalendarData.forEach((story) => {
      DEADLINE_TYPES.forEach(({ field, label, color, textColor }) => {
        const dateStr = story[field];
        const date = parseDate(dateStr);

        if (date && isWithinInterval(date, { start, end })) {
          const daysUntil = differenceInDays(date, today);
          deadlines.push({
            id: `${story.id}-${field}`,
            storyId: story.id,
            storyTitle: story.story_title || story.news_peg || 'Untitled Story',
            brand: story.brand,
            deadlineType: label,
            field,
            date,
            dateStr: format(date, 'EEE, MMM d'),
            daysUntil,
            color,
            textColor,
            status: story.status,
            studyUrl: story.study_url,
            notes: story.notes,
            isOverdue: daysUntil < 0,
            isToday: daysUntil === 0,
            isTomorrow: daysUntil === 1,
          });
        }
      });
    });

    // Sort by date, then by story title
    return deadlines.sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date.getTime() - b.date.getTime();
      }
      return a.storyTitle.localeCompare(b.storyTitle);
    });
  }, [contentCalendarData, weekRange]);

  // Group deadlines by day
  const groupedByDay = useMemo(() => {
    const groups = {};
    deadlinesThisWeek.forEach((deadline) => {
      const dayKey = format(deadline.date, 'yyyy-MM-dd');
      if (!groups[dayKey]) {
        groups[dayKey] = {
          date: deadline.date,
          label: deadline.isOverdue
            ? 'Overdue'
            : deadline.isToday
              ? 'Today'
              : deadline.isTomorrow
                ? 'Tomorrow'
                : format(deadline.date, 'EEEE, MMM d'),
          deadlines: [],
          isOverdue: deadline.isOverdue,
          isToday: deadline.isToday,
        };
      }
      groups[dayKey].deadlines.push(deadline);
    });
    return Object.values(groups);
  }, [deadlinesThisWeek]);

  // Summary stats
  const stats = useMemo(() => {
    const overdue = deadlinesThisWeek.filter(d => d.isOverdue).length;
    const today = deadlinesThisWeek.filter(d => d.isToday).length;
    const upcoming = deadlinesThisWeek.filter(d => !d.isOverdue && !d.isToday).length;
    return { overdue, today, upcoming, total: deadlinesThisWeek.length };
  }, [deadlinesThisWeek]);

  const toggleStoryExpand = (storyId) => {
    setExpandedStories(prev => ({
      ...prev,
      [storyId]: !prev[storyId],
    }));
  };

  // Get unique stories for this week
  const storiesThisWeek = useMemo(() => {
    const storyMap = new Map();
    deadlinesThisWeek.forEach((deadline) => {
      if (!storyMap.has(deadline.storyId)) {
        storyMap.set(deadline.storyId, {
          id: deadline.storyId,
          title: deadline.storyTitle,
          brand: deadline.brand,
          status: deadline.status,
          studyUrl: deadline.studyUrl,
          notes: deadline.notes,
          deadlines: [],
        });
      }
      storyMap.get(deadline.storyId).deadlines.push(deadline);
    });
    return Array.from(storyMap.values());
  }, [deadlinesThisWeek]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Due This Week</h1>
            <p className="text-sm text-gray-500 mt-1">
              {format(weekRange.start, 'MMM d')} - {format(weekRange.end, 'MMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Deadlines</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${stats.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className={`text-3xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {stats.overdue}
            </div>
            <div className={`text-sm ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-500'}`}>Overdue</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${stats.today > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <div className={`text-3xl font-bold ${stats.today > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {stats.today}
            </div>
            <div className={`text-sm ${stats.today > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Due Today</div>
          </div>
          <div className="bg-ls-green-lighter rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-ls-green">{stats.upcoming}</div>
            <div className="text-sm text-ls-green">Upcoming</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw size={32} className="animate-spin text-gray-400" />
          </div>
        ) : deadlinesThisWeek.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-ls-green mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-500">No deadlines due this week.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline View */}
            {groupedByDay.map((group) => (
              <div key={group.label} className="bg-white rounded-lg border overflow-hidden">
                <div
                  className={`px-4 py-3 border-b flex items-center gap-3 ${
                    group.isOverdue
                      ? 'bg-red-50'
                      : group.isToday
                        ? 'bg-amber-50'
                        : 'bg-gray-50'
                  }`}
                >
                  <Calendar
                    size={20}
                    className={
                      group.isOverdue
                        ? 'text-red-500'
                        : group.isToday
                          ? 'text-amber-500'
                          : 'text-gray-500'
                    }
                  />
                  <h3
                    className={`font-semibold ${
                      group.isOverdue
                        ? 'text-red-700'
                        : group.isToday
                          ? 'text-amber-700'
                          : 'text-gray-700'
                    }`}
                  >
                    {group.label}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {group.deadlines.length} deadline{group.deadlines.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y">
                  {group.deadlines.map((deadline) => (
                    <div key={deadline.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${deadline.color} ${deadline.textColor}`}
                        >
                          {deadline.deadlineType}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {deadline.storyTitle}
                            </h4>
                            {deadline.studyUrl && (
                              <a
                                href={deadline.studyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-ls-green"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                          {deadline.brand && (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{
                                backgroundColor: deadline.brand?.toLowerCase().includes('lawn love')
                                  ? '#246227'
                                  : deadline.brand?.toLowerCase().includes('lawnstarter')
                                    ? '#069C55'
                                    : '#6b7280'
                              }}
                            >
                              {deadline.brand}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-medium ${
                              deadline.isOverdue
                                ? 'text-red-600'
                                : deadline.isToday
                                  ? 'text-amber-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            {deadline.isOverdue
                              ? `${Math.abs(deadline.daysUntil)} day${Math.abs(deadline.daysUntil) !== 1 ? 's' : ''} ago`
                              : deadline.isToday
                                ? 'Today'
                                : deadline.isTomorrow
                                  ? 'Tomorrow'
                                  : `In ${deadline.daysUntil} days`}
                          </div>
                          <div className="text-xs text-gray-400">{deadline.dateStr}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Stories Summary */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Stories with Deadlines This Week</h2>
              <div className="space-y-3">
                {storiesThisWeek.map((story) => (
                  <div key={story.id} className="bg-white rounded-lg border overflow-hidden">
                    <button
                      onClick={() => toggleStoryExpand(story.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {story.brand && (
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{
                              backgroundColor: story.brand?.toLowerCase().includes('lawn love')
                                ? '#246227'
                                : story.brand?.toLowerCase().includes('lawnstarter')
                                  ? '#069C55'
                                  : '#6b7280'
                            }}
                          >
                            {story.brand}
                          </span>
                        )}
                        <span className="font-medium text-gray-900">{story.title}</span>
                        <span className="text-sm text-gray-500">
                          ({story.deadlines.length} deadline{story.deadlines.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      {expandedStories[story.id] ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </button>
                    {expandedStories[story.id] && (
                      <div className="px-4 py-3 bg-gray-50 border-t space-y-2">
                        {story.deadlines.map((deadline) => (
                          <div key={deadline.id} className="flex items-center justify-between text-sm">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${deadline.color} ${deadline.textColor}`}>
                              {deadline.deadlineType}
                            </span>
                            <span className={deadline.isOverdue ? 'text-red-600' : deadline.isToday ? 'text-amber-600' : 'text-gray-600'}>
                              {deadline.dateStr}
                              {deadline.isOverdue && ' (Overdue)'}
                              {deadline.isToday && ' (Today)'}
                            </span>
                          </div>
                        ))}
                        {story.notes && (
                          <div className="mt-2 pt-2 border-t text-sm text-gray-600">
                            <strong>Notes:</strong> {story.notes}
                          </div>
                        )}
                        {story.studyUrl && (
                          <a
                            href={story.studyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-ls-green hover:underline mt-2"
                          >
                            <ExternalLink size={14} />
                            View Study
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
