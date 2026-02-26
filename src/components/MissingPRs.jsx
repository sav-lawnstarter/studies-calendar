import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, RefreshCw, Calendar, ChevronDown, ChevronUp, CheckCircle, FileWarning } from 'lucide-react';
import { differenceInDays, isBefore } from 'date-fns';
import { getStoredToken, fetchContentCalendarData, loadGoogleScript, authenticateWithGoogle } from '../utils/googleSheets';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return new Date(year, parseInt(month) - 1, parseInt(day));
  }
  return null;
};

const getOverdueColor = (days) => {
  if (days > 30) return 'bg-red-100 text-red-700';
  if (days > 7) return 'bg-orange-100 text-orange-700';
  return 'bg-yellow-100 text-yellow-700';
};

export default function MissingPRs() {
  const [contentCalendarData, setContentCalendarData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedStories, setExpandedStories] = useState({});
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const fetchData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      if (clientId) {
        try {
          setIsLoading(true);
          await loadGoogleScript();
          const newToken = await authenticateWithGoogle(clientId);
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
    try {
      const data = await fetchContentCalendarData(token);
      setContentCalendarData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stories past production date with no published URL
  const missingPRStories = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contentCalendarData
      .filter(story => {
        const productionDate = parseDate(story.production_date);
        if (!productionDate) return false;
        if (!isBefore(productionDate, today)) return false;
        if (story.study_url && story.study_url.trim()) return false;
        return true;
      })
      .map(story => ({
        ...story,
        daysOverdue: differenceInDays(today, parseDate(story.production_date)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [contentCalendarData]);

  const toggleExpand = (id) => {
    setExpandedStories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileWarning size={24} className="text-orange-500" />
            Missing PRs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Stories past their production date without a published URL
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-dark transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading content calendar…
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!isLoading && !error && contentCalendarData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No content calendar data loaded.</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-dark transition-colors text-sm"
          >
            Load Data
          </button>
        </div>
      )}

      {!isLoading && !error && contentCalendarData.length > 0 && missingPRStories.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center">
          <CheckCircle size={44} className="text-green-500 mx-auto mb-3" />
          <p className="text-green-700 font-semibold text-lg">All caught up!</p>
          <p className="text-green-600 text-sm mt-1">
            No stories with missing publication URLs found.
          </p>
        </div>
      )}

      {!isLoading && missingPRStories.length > 0 && (
        <>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-5 flex items-center gap-3">
            <AlertCircle size={20} className="text-orange-500 flex-shrink-0" />
            <p className="text-orange-700">
              <strong>{missingPRStories.length}</strong>{' '}
              {missingPRStories.length === 1 ? 'story' : 'stories'} past production date without a published URL
            </p>
          </div>

          <div className="space-y-3">
            {missingPRStories.map(story => (
              <div
                key={story.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(story.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 leading-snug">
                        {story.story_title || story.news_peg || 'Untitled Story'}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {story.brand && (
                          <span className="text-xs bg-ls-green text-white px-2 py-0.5 rounded-full font-medium">
                            {story.brand}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={11} />
                          Production: {story.production_date}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getOverdueColor(story.daysOverdue)}`}>
                          {story.daysOverdue}d overdue
                        </span>
                        {story.status && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {story.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 pt-0.5">
                      {expandedStories[story.id]
                        ? <ChevronUp size={16} className="text-gray-400" />
                        : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </div>

                {expandedStories[story.id] && (
                  <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {story.pitch_date && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Pitch Date</p>
                          <p className="text-gray-800 font-medium">{story.pitch_date}</p>
                        </div>
                      )}
                      {story.analysis_due_by && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Analysis Due</p>
                          <p className="text-gray-800 font-medium">{story.analysis_due_by}</p>
                        </div>
                      )}
                      {story.edits_due_by && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Edits Due</p>
                          <p className="text-gray-800 font-medium">{story.edits_due_by}</p>
                        </div>
                      )}
                      {story.qa_due_by && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">QA Due</p>
                          <p className="text-gray-800 font-medium">{story.qa_due_by}</p>
                        </div>
                      )}
                      {story._experts_contacted && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Experts Contacted</p>
                          <p className="text-gray-800 font-medium">{story._experts_contacted}</p>
                        </div>
                      )}
                      {story._expert_responses && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Expert Responses</p>
                          <p className="text-gray-800 font-medium">{story._expert_responses}</p>
                        </div>
                      )}
                      {story.notes && (
                        <div className="col-span-2 md:col-span-3">
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Notes</p>
                          <p className="text-gray-700">{story.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
