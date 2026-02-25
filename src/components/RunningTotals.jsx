import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Link, Users, MessageSquare, RefreshCw, ChevronLeft, ChevronRight, TrendingUp, Target } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { getStoredToken, fetchContentCalendarData, fetchSheetData, loadGoogleScript, authenticateWithGoogle } from '../utils/googleSheets';

// Custom quarter definitions (same as ContentCalendar)
// Q4: Dec 1 - Feb 28/29, Q1: Mar 1 - May 31, Q2: Jun 1 - Aug 31, Q3: Sep 1 - Nov 30
const getCustomQuarter = (date) => {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  if (month >= 2 && month <= 4) { // Mar-May
    return { quarter: 1, fiscalYear: year };
  }
  if (month >= 5 && month <= 7) { // Jun-Aug
    return { quarter: 2, fiscalYear: year };
  }
  if (month >= 8 && month <= 10) { // Sep-Nov
    return { quarter: 3, fiscalYear: year };
  }
  // Q4: Dec or Jan-Feb
  if (month === 11) { // December
    return { quarter: 4, fiscalYear: year };
  }
  // Jan-Feb: Q4 of previous fiscal year
  return { quarter: 4, fiscalYear: year - 1 };
};

const getCustomQuarterStart = (date) => {
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month >= 2 && month <= 4) return new Date(year, 2, 1); // Mar 1
  if (month >= 5 && month <= 7) return new Date(year, 5, 1); // Jun 1
  if (month >= 8 && month <= 10) return new Date(year, 8, 1); // Sep 1
  if (month === 11) return new Date(year, 11, 1); // Dec 1
  // Jan-Feb: Dec 1 of previous year
  return new Date(year - 1, 11, 1);
};

const getCustomQuarterEnd = (date) => {
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month >= 2 && month <= 4) return new Date(year, 4, 31); // May 31
  if (month >= 5 && month <= 7) return new Date(year, 7, 31); // Aug 31
  if (month >= 8 && month <= 10) return new Date(year, 10, 30); // Nov 30
  if (month === 11) return new Date(year + 1, 1, 28); // Feb end of next year
  // Jan-Feb: Feb end of current year
  return new Date(year, 1, 28);
};

// Navigate to next/previous quarter
const getNextQuarterDate = (date) => {
  const { quarter } = getCustomQuarter(date);
  if (quarter === 1) return addMonths(date, 3); // Mar -> Jun
  if (quarter === 2) return addMonths(date, 3); // Jun -> Sep
  if (quarter === 3) return addMonths(date, 3); // Sep -> Dec
  return addMonths(date, 3); // Dec -> Mar
};

const getPrevQuarterDate = (date) => {
  const { quarter } = getCustomQuarter(date);
  if (quarter === 1) return subMonths(date, 3); // Mar -> Dec
  if (quarter === 2) return subMonths(date, 3); // Jun -> Mar
  if (quarter === 3) return subMonths(date, 3); // Sep -> Jun
  return subMonths(date, 3); // Dec -> Sep
};

// Parse date string to Date object
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

export default function RunningTotals() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [contentCalendarData, setContentCalendarData] = useState([]);
  const [studyStoryData, setStudyStoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Fetch Content Calendar data and Study Story Data
  const fetchData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      if (clientId) {
        try {
          await loadGoogleScript();
          const newToken = await authenticateWithGoogle(clientId);
          setIsLoading(true);
          const [calendarData, storyData] = await Promise.all([
            fetchContentCalendarData(newToken),
            fetchSheetData(newToken),
          ]);
          setContentCalendarData(calendarData);
          setStudyStoryData(storyData);
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
      const [calendarData, storyData] = await Promise.all([
        fetchContentCalendarData(token),
        fetchSheetData(token),
      ]);
      setContentCalendarData(calendarData);
      setStudyStoryData(storyData);
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

  // Get current quarter info
  const quarterInfo = useMemo(() => {
    const { quarter, fiscalYear } = getCustomQuarter(currentDate);
    const start = getCustomQuarterStart(currentDate);
    const end = getCustomQuarterEnd(currentDate);
    return { quarter, fiscalYear, start, end };
  }, [currentDate]);

  // Filter stories for current quarter
  const quarterStories = useMemo(() => {
    return contentCalendarData.filter((story) => {
      const pitchDate = parseDate(story.pitch_date);
      if (!pitchDate) return false;
      return pitchDate >= quarterInfo.start && pitchDate <= quarterInfo.end;
    });
  }, [contentCalendarData, quarterInfo]);

  // Helper function to get link count from a story, supporting multiple column names
  const getLinkCount = useCallback((story) => {
    // Support multiple possible column names for link count
    // "Study Link #" -> study_link_, "Study Links #" -> study_links_, "Links" -> links, etc.
    const linkValue = story['study_link_'] || story['study_links_'] || story['links'] || story['link_count'] || story['link_'] || '0';
    return parseInt(linkValue) || 0;
  }, []);

  // Helper function to normalize title for matching
  // Aggressively normalize to handle punctuation differences between sheets
  const normalizeTitle = useCallback((title) => {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      // Remove common punctuation that might differ between sheets
      .replace(/[''`]/g, '') // Remove apostrophes and quotes
      .replace(/[""]/g, '') // Remove smart quotes
      .replace(/[:\-–—]/g, ' ') // Replace colons and dashes with spaces
      .replace(/[.,!?;]/g, '') // Remove other punctuation
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }, []);

  // Calculate link statistics from Study Story Data sheet - filter by date in Study Story Data
  const linkStats = useMemo(() => {
    // Count links from Study Story Data using Study Link # column
    // Filter by date directly from Study Story Data (not by title matching)
    let lawnstarterLinks = 0;
    let lawnloveLinks = 0;

    studyStoryData.forEach((story) => {
      // Check if story has a date and if it falls within current quarter
      // Support both "Date Pitched" (date_pitched) and "Pitch Date" (pitch_date) column names
      const pitchDate = parseDate(story.date_pitched || story.pitch_date);
      if (pitchDate && (pitchDate < quarterInfo.start || pitchDate > quarterInfo.end)) {
        return; // Skip stories outside current quarter
      }

      // Use helper to get link count (supports multiple column names)
      const linkCount = getLinkCount(story);
      const brand = story.brand?.toLowerCase() || '';

      if (brand.includes('lawnstarter')) {
        lawnstarterLinks += linkCount;
      } else if (brand.includes('lawn love')) {
        lawnloveLinks += linkCount;
      }
    });

    return {
      lawnstarterLinks,
      lawnloveLinks,
      totalLinks: lawnstarterLinks + lawnloveLinks,
    };
  }, [studyStoryData, quarterInfo, getLinkCount]);

  // Normalize date string to YYYY-MM-DD format for consistent matching
  const normalizeDate = useCallback((dateStr) => {
    const parsed = parseDate(dateStr);
    if (!parsed) return '';
    // Return ISO date string (YYYY-MM-DD)
    return parsed.toISOString().split('T')[0];
  }, []);

  // Create maps for matching stories by title and by date
  // Title matching is more reliable across different sheets
  const storyLinkMaps = useMemo(() => {
    const byTitle = new Map();
    const byDate = new Map();
    const allTitles = []; // Store all titles for fuzzy matching

    studyStoryData.forEach((story) => {
      // Use helper to get link count (supports multiple column names)
      const linkCount = getLinkCount(story);

      // Add to title map - Study Story Data uses "study_title" or "story_title"
      const title = normalizeTitle(story.study_title || story.story_title || story.title);
      if (title && linkCount > 0) {
        byTitle.set(title, linkCount);
        allTitles.push({ title, linkCount });
      }

      // Also add to date map as fallback - support both date_pitched and pitch_date column names
      const dateKey = normalizeDate(story.date_pitched || story.pitch_date);
      if (dateKey && linkCount > 0) {
        byDate.set(dateKey, linkCount);
      }
    });

    return { byTitle, byDate, allTitles };
  }, [studyStoryData, normalizeDate, normalizeTitle, getLinkCount]);

  // Get link count for a story by matching title first, then falling back to fuzzy match, then date
  const getStoryLinkInfo = useCallback((story) => {
    // Try to match by title first (more reliable across sheets)
    const title = normalizeTitle(story.story_title || story.title);
    if (title) {
      // 1. Exact title match
      const linksByTitle = storyLinkMaps.byTitle.get(title);
      if (linksByTitle !== undefined) {
        return linksByTitle;
      }

      // 2. Fuzzy match - check if title contains or is contained in any study title
      // This handles cases where titles have minor differences
      for (const { title: studyTitle, linkCount } of storyLinkMaps.allTitles) {
        // Check if either title contains the other (at least 20 chars to avoid false positives)
        if (title.length >= 20 && studyTitle.length >= 20) {
          if (studyTitle.includes(title) || title.includes(studyTitle)) {
            return linkCount;
          }
        }
        // Also check for significant word overlap (at least 3 matching words of 4+ chars)
        const titleWords = title.split(' ').filter(w => w.length >= 4);
        const studyWords = studyTitle.split(' ').filter(w => w.length >= 4);
        const matchingWords = titleWords.filter(w => studyWords.includes(w));
        if (matchingWords.length >= 3) {
          return linkCount;
        }
      }
    }

    // 3. Fall back to date matching
    const dateKey = normalizeDate(story.pitch_date || story.date_pitched);
    if (dateKey) {
      return storyLinkMaps.byDate.get(dateKey) || 0;
    }

    return 0;
  }, [storyLinkMaps, normalizeDate, normalizeTitle]);

  // Calculate top 3 stories by links for trophy display
  const topStoriesByLinks = useMemo(() => {
    const storiesWithLinks = quarterStories
      .map((story) => ({
        id: story.id,
        links: getStoryLinkInfo(story),
      }))
      .filter((s) => s.links > 0)
      .sort((a, b) => b.links - a.links);

    const top3 = [];
    if (storiesWithLinks.length > 0) top3.push({ id: storiesWithLinks[0].id, links: storiesWithLinks[0].links, rank: 1 });
    if (storiesWithLinks.length > 1 && storiesWithLinks[1].links !== storiesWithLinks[0].links) {
      top3.push({ id: storiesWithLinks[1].id, links: storiesWithLinks[1].links, rank: 2 });
    } else if (storiesWithLinks.length > 1) {
      top3.push({ id: storiesWithLinks[1].id, links: storiesWithLinks[1].links, rank: 1 }); // Tie for 1st
    }
    if (storiesWithLinks.length > 2) {
      const rank = storiesWithLinks[2].links === storiesWithLinks[0].links ? 1 :
                   storiesWithLinks[2].links === storiesWithLinks[1]?.links ? (top3[1]?.rank || 2) : 3;
      if (rank <= 3) {
        top3.push({ id: storiesWithLinks[2].id, links: storiesWithLinks[2].links, rank });
      }
    }

    return top3;
  }, [quarterStories, getStoryLinkInfo]);

  // Get trophy emoji for a story
  const getTrophyEmoji = useCallback((storyId) => {
    const topStory = topStoriesByLinks.find((s) => s.id === storyId);
    if (!topStory) return '';
    if (topStory.rank === 1) return '🏆 ';
    if (topStory.rank === 2) return '🥈 ';
    if (topStory.rank === 3) return '🥉 ';
    return '';
  }, [topStoriesByLinks]);

  // Calculate statistics from Content Calendar
  const stats = useMemo(() => {
    // Total stories pitched (have a pitch date in this quarter)
    const totalStories = quarterStories.length;

    // Pitched stories (status is "Pitched" or similar)
    const pitchedStories = quarterStories.filter((s) =>
      s.status?.toLowerCase() === 'pitched' ||
      s.status?.toLowerCase() === 'published' ||
      s.status?.toLowerCase() === 'complete'
    ).length;

    // Remaining stories due (not yet pitched)
    const remainingStories = totalStories - pitchedStories;

    // Count stories by brand for this quarter
    const lawnstarterStories = quarterStories.filter((s) =>
      s.brand?.toLowerCase().includes('lawnstarter')
    ).length;

    const lawnloveStories = quarterStories.filter((s) =>
      s.brand?.toLowerCase().includes('lawn love')
    ).length;

    // Experts contacted and responded
    let totalExpertsContacted = 0;
    let totalExpertsResponded = 0;

    quarterStories.forEach((story) => {
      // Parse experts contacted (might be a number or string)
      const contacted = parseInt(story._experts_contacted) || 0;
      totalExpertsContacted += contacted;

      // Use # Expert Responses column (column J) for experts responded
      const responded = parseInt(story._expert_responses) || 0;
      totalExpertsResponded += responded;
    });

    return {
      totalStories,
      pitchedStories,
      remainingStories,
      lawnstarterStories,
      lawnloveStories,
      totalExpertsContacted,
      totalExpertsResponded,
    };
  }, [quarterStories]);

  // Navigation
  const navigatePrev = () => setCurrentDate(getPrevQuarterDate(currentDate));
  const navigateNext = () => setCurrentDate(getNextQuarterDate(currentDate));
  const goToCurrentQuarter = () => setCurrentDate(new Date());

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Running Totals</h1>
            <button
              onClick={goToCurrentQuarter}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Current Quarter
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={navigatePrev}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="text-lg font-semibold text-gray-700">
              Q{quarterInfo.quarter} {quarterInfo.fiscalYear}
            </div>
            <div className="text-sm text-gray-500">
              ({format(quarterInfo.start, 'MMM d')} - {format(quarterInfo.end, 'MMM d, yyyy')})
            </div>
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 mb-6">
            {error}
          </div>
        ) : null}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-ls-green-lighter rounded-lg">
                <FileText size={20} className="text-ls-green" />
              </div>
              <span className="text-sm text-gray-500">Total Stories</span>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats.totalStories}</p>
            <p className="text-sm text-gray-500 mt-1">Scheduled this quarter</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Pitched</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.pitchedStories}</p>
            <p className="text-sm text-gray-500 mt-1">Stories completed</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Target size={20} className="text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">Remaining Stories Due</span>
            </div>
            <p className="text-4xl font-bold text-amber-600">{stats.remainingStories}</p>
            <p className="text-sm text-gray-500 mt-1">Still to complete</p>
          </div>
        </div>

        {/* Links by Brand (from Study Story Data sheet) */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Links by Brand</h2>
        <p className="text-sm text-gray-500 mb-4">Links from stories pitched this quarter</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: '#069C55' }}
              />
              <span className="font-semibold text-gray-900">LawnStarter</span>
            </div>
            <div className="flex items-center gap-2">
              <Link size={20} className="text-ls-green" />
              <p className="text-4xl font-bold text-ls-green">{linkStats.lawnstarterLinks}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              total links
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: '#246227' }}
              />
              <span className="font-semibold text-gray-900">Lawn Love</span>
            </div>
            <div className="flex items-center gap-2">
              <Link size={20} className="text-green-800" />
              <p className="text-4xl font-bold text-green-800">{linkStats.lawnloveLinks}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              total links
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6 bg-gradient-to-br from-ls-green-lighter to-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-semibold text-gray-900">Total Links</span>
            </div>
            <div className="flex items-center gap-2">
              <Link size={24} className="text-ls-green" />
              <p className="text-5xl font-bold text-ls-green">{linkStats.totalLinks}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Combined across both brands
            </p>
          </div>
        </div>

        {/* Expert Outreach */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Expert Outreach</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare size={20} className="text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Experts Responded</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{stats.totalExpertsResponded}</p>
            <p className="text-sm text-gray-500 mt-1">Total responses this quarter</p>
          </div>
        </div>

        {/* Quarter Stories List */}
        {quarterStories.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stories This Quarter</h2>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Story</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Brand</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Pitch Date</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Links</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Experts</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quarterStories.map((story) => {
                    const pitchDate = parseDate(story.pitch_date);
                    const linkCount = getStoryLinkInfo(story);
                    const trophy = getTrophyEmoji(story.id);
                    return (
                      <tr key={story.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {trophy}{story.story_title || story.news_peg || 'Untitled'}
                          </div>
                          {story.news_peg && story.story_title && (
                            <div className="text-sm text-gray-500">{story.news_peg}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {story.brand && (
                            <span
                              className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
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
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {pitchDate ? format(pitchDate, 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              story.status?.toLowerCase() === 'pitched' || story.status?.toLowerCase() === 'published'
                                ? 'bg-green-100 text-green-700'
                                : story.status?.toLowerCase() === 'in progress'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {story.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-ls-green">
                          {linkCount > 0 ? linkCount : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {story._expert_responses || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
