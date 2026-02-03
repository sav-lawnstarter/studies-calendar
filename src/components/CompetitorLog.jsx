import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  ExternalLink,
  Search,
  Calendar,
  Building2,
  X,
  Loader2,
  Filter,
  Flame,
  Newspaper,
  CheckCircle,
  HelpCircle,
  XCircle,
  Link2,
  Trash2,
  Edit3,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  getStoredToken,
  fetchContentCalendarData,
  loadGoogleScript,
  authenticateWithGoogle,
  fetchCompetitorLogData,
  appendCompetitorLog,
  updateCompetitorLog,
  deleteCompetitorLog,
} from '../utils/googleSheets';
import { format, parseISO, differenceInDays } from 'date-fns';

// Check if a date is within the last N days
const isRecent = (dateStr, days = 60) => {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    const diffDays = differenceInDays(new Date(), date);
    return diffDays >= 0 && diffDays <= days;
  } catch {
    return false;
  }
};

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  try {
    return format(parseISO(dateStr), 'MMM yyyy');
  } catch {
    return dateStr;
  }
};

// Format full date for display
const formatFullDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

export default function CompetitorLog() {
  // Competitor entries state from Google Sheets
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Content Calendar stories for linking
  const [calendarStories, setCalendarStories] = useState([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [storiesError, setStoriesError] = useState(null);

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filterLinkedStory, setFilterLinkedStory] = useState('all');
  const [filterCoverage, setFilterCoverage] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Fetch Content Calendar stories
  const fetchStories = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      if (clientId) {
        try {
          await loadGoogleScript();
          const newToken = await authenticateWithGoogle(clientId);
          setIsLoadingStories(true);
          const data = await fetchContentCalendarData(newToken);
          setCalendarStories(data);
          setStoriesError(null);
        } catch (err) {
          console.error('Auth error:', err);
          setStoriesError('Sign in via Story & Pitch Analysis to load stories.');
        } finally {
          setIsLoadingStories(false);
        }
      }
      return;
    }

    setIsLoadingStories(true);
    setStoriesError(null);
    try {
      const data = await fetchContentCalendarData(token);
      setCalendarStories(data);
    } catch (err) {
      console.error('Stories fetch error:', err);
      setStoriesError(err.message);
    } finally {
      setIsLoadingStories(false);
    }
  }, [clientId]);

  // Fetch competitor log entries from Google Sheets
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let token = getStoredToken();

      if (!token) {
        if (clientId) {
          await loadGoogleScript();
          token = await authenticateWithGoogle(clientId);
        } else {
          throw new Error('Google Client ID not configured');
        }
      }

      const data = await fetchCompetitorLogData(token);
      setEntries(data);
    } catch (err) {
      console.error('Error fetching competitor log:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // Load data on mount
  useEffect(() => {
    fetchStories();
    fetchEntries();
  }, [fetchStories, fetchEntries]);

  // Get story title by ID
  const getStoryTitle = (storyId) => {
    if (!storyId || storyId === 'none') return null;
    const story = calendarStories.find((s) => s.id === storyId);
    return story?.story_title || story?.news_peg || story?.brand || 'Unknown Story';
  };

  // Get story title from entry (either from linkedStory string or linkedStoryId)
  const getEntryStoryTitle = (entry) => {
    // If we have a linkedStory string from the sheet, use that directly
    if (entry.linkedStory) {
      return entry.linkedStory;
    }
    // Fallback to looking up by ID (for backwards compatibility)
    return getStoryTitle(entry.linkedStoryId);
  };

  // Add a new entry
  const handleAddEntry = async (entryData) => {
    setIsSaving(true);
    setError(null);

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('Not authenticated. Please refresh the page.');
      }

      // Get the story title for the linked story
      const linkedStoryTitle = getStoryTitle(entryData.linkedStoryId) || '';

      const newEntry = {
        ...entryData,
        dateAdded: new Date().toISOString().split('T')[0],
      };

      await appendCompetitorLog(token, newEntry, linkedStoryTitle);
      setShowAddModal(false);
      await fetchEntries();
    } catch (err) {
      console.error('Error adding competitor entry:', err);
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Update an existing entry
  const handleUpdateEntry = async (entryData) => {
    if (!editingEntry) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('Not authenticated. Please refresh the page.');
      }

      // Get the story title for the linked story
      const linkedStoryTitle = getStoryTitle(entryData.linkedStoryId) || '';

      const updatedEntry = {
        ...entryData,
        dateAdded: editingEntry.dateAdded,
      };

      await updateCompetitorLog(token, editingEntry.rowIndex, updatedEntry, linkedStoryTitle);
      setEditingEntry(null);
      setShowAddModal(false);
      await fetchEntries();
    } catch (err) {
      console.error('Error updating competitor entry:', err);
      setError(`Failed to update: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an entry
  const handleDeleteEntry = async (entry) => {
    if (!window.confirm('Are you sure you want to delete this competitor entry?')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('Not authenticated. Please refresh the page.');
      }

      await deleteCompetitorLog(token, entry.rowIndex);
      await fetchEntries();
    } catch (err) {
      console.error('Error deleting competitor entry:', err);
      setError(`Failed to delete: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          entry.title?.toLowerCase().includes(query) ||
          entry.publisher?.toLowerCase().includes(query) ||
          entry.coverageNotes?.toLowerCase().includes(query) ||
          entry.qualityNotes?.toLowerCase().includes(query) ||
          entry.url?.toLowerCase().includes(query) ||
          entry.linkedStory?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Linked story filter
      if (filterLinkedStory !== 'all') {
        if (filterLinkedStory === 'unlinked') {
          if (entry.linkedStory && entry.linkedStory.trim()) return false;
        } else {
          // Match by story title
          const storyTitle = getStoryTitle(filterLinkedStory);
          if (entry.linkedStory !== storyTitle) return false;
        }
      }

      // Coverage filter
      if (filterCoverage !== 'all') {
        if (entry.gotCoverage !== filterCoverage) return false;
      }

      // Date range filter
      if (filterDateRange !== 'all' && entry.publishDate) {
        try {
          const pubDate = parseISO(entry.publishDate);
          const now = new Date();
          if (filterDateRange === '30days') {
            if (differenceInDays(now, pubDate) > 30) return false;
          } else if (filterDateRange === '60days') {
            if (differenceInDays(now, pubDate) > 60) return false;
          } else if (filterDateRange === '90days') {
            if (differenceInDays(now, pubDate) > 90) return false;
          } else if (filterDateRange === '1year') {
            if (differenceInDays(now, pubDate) > 365) return false;
          }
        } catch {
          // If date parsing fails, include the entry
        }
      }

      return true;
    });
  }, [entries, searchQuery, filterLinkedStory, filterCoverage, filterDateRange, calendarStories]);

  // Calculate Quick Insights
  const quickInsights = useMemo(() => {
    if (entries.length === 0) return null;

    const withCoverage = entries.filter((e) => e.gotCoverage === 'yes').length;
    const totalWithCoverageInfo = entries.filter(
      (e) => e.gotCoverage === 'yes' || e.gotCoverage === 'no'
    ).length;

    // Find most recent competitor piece
    let mostRecentDays = null;
    entries.forEach((entry) => {
      if (entry.publishDate) {
        try {
          const days = differenceInDays(new Date(), parseISO(entry.publishDate));
          if (days >= 0 && (mostRecentDays === null || days < mostRecentDays)) {
            mostRecentDays = days;
          }
        } catch {
          // Ignore invalid dates
        }
      }
    });

    return {
      totalEntries: entries.length,
      withCoverage,
      totalWithCoverageInfo,
      mostRecentDays,
    };
  }, [entries]);

  // Get unique linked stories for filter dropdown
  const linkedStoryOptions = useMemo(() => {
    const storyTitles = new Set(
      entries
        .filter((e) => e.linkedStory && e.linkedStory.trim())
        .map((e) => e.linkedStory)
    );
    // Return calendar stories that have been linked
    return calendarStories.filter((s) => {
      const title = s.story_title || s.news_peg || s.brand;
      return storyTitles.has(title);
    });
  }, [entries, calendarStories]);

  // Open Google News search for an entry
  const openNewsSearch = (entry) => {
    const searchQuery = encodeURIComponent(
      `"${entry.title || ''}" ${entry.publisher || ''}`
    );
    window.open(`https://news.google.com/search?q=${searchQuery}`, '_blank');
  };

  // Coverage badge component
  const CoverageBadge = ({ coverage }) => {
    if (coverage === 'yes') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle size={12} />
          Yes
        </span>
      );
    }
    if (coverage === 'no') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <XCircle size={12} />
          No
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        <HelpCircle size={12} />
        Not Sure
      </span>
    );
  };

  // Add/Edit Modal Component
  const AddEditModal = () => {
    const [url, setUrl] = useState(editingEntry?.url || '');
    const [title, setTitle] = useState(editingEntry?.title || '');
    const [publisher, setPublisher] = useState(editingEntry?.publisher || '');
    const [publishDate, setPublishDate] = useState(editingEntry?.publishDate || '');
    const [linkedStoryId, setLinkedStoryId] = useState('none');
    const [gotCoverage, setGotCoverage] = useState(editingEntry?.gotCoverage || 'not_sure');
    const [coverageNotes, setCoverageNotes] = useState(editingEntry?.coverageNotes || '');
    const [qualityNotes, setQualityNotes] = useState(editingEntry?.qualityNotes || '');
    const [isScrapingUrl, setIsScrapingUrl] = useState(false);
    const [scrapeError, setScrapeError] = useState(null);

    // Initialize linkedStoryId when editing
    useEffect(() => {
      if (editingEntry?.linkedStory) {
        // Find the story ID by matching the title
        const matchingStory = calendarStories.find((s) => {
          const title = s.story_title || s.news_peg || s.brand;
          return title === editingEntry.linkedStory;
        });
        if (matchingStory) {
          setLinkedStoryId(matchingStory.id);
        }
      }
    }, [editingEntry, calendarStories]);

    // Auto-fill from URL
    const handleUrlPaste = async (newUrl) => {
      setUrl(newUrl);
      if (!newUrl || newUrl.length < 10) return;

      // Validate URL format
      try {
        new URL(newUrl);
      } catch {
        return;
      }

      setIsScrapingUrl(true);
      setScrapeError(null);

      try {
        // Try serverless API first
        const apiUrl = `/api/scrape-url?url=${encodeURIComponent(newUrl)}`;
        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.success && result.data) {
          if (result.data.title && !title) {
            setTitle(result.data.title);
          }
          if (result.data.publisher && !publisher) {
            setPublisher(result.data.publisher);
          }
          if (result.data.publishDate && !publishDate) {
            setPublishDate(result.data.publishDate);
          }
        } else {
          setScrapeError('Could not auto-fill. Please enter details manually.');
        }
      } catch (err) {
        console.error('URL scrape error:', err);
        setScrapeError('Could not auto-fill. Please enter details manually.');
      } finally {
        setIsScrapingUrl(false);
      }
    };

    const handleSubmit = () => {
      if (!url.trim()) return;

      const entryData = {
        url: url.trim(),
        title: title.trim() || null,
        publisher: publisher.trim() || null,
        publishDate: publishDate || null,
        linkedStoryId,
        gotCoverage,
        coverageNotes: coverageNotes.trim() || null,
        qualityNotes: qualityNotes.trim() || null,
      };

      if (editingEntry) {
        handleUpdateEntry(entryData);
      } else {
        handleAddEntry(entryData);
      }
    };

    const handleClose = () => {
      setShowAddModal(false);
      setEditingEntry(null);
    };

    if (!showAddModal) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEntry ? 'Edit Competitor Piece' : 'Add Competitor Piece'}
              </h3>
              <p className="text-xs text-gray-500">
                Log competitor articles for research and comparison
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4">
            {/* Your Story Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Linked Story (optional)
              </label>
              <select
                value={linkedStoryId}
                onChange={(e) => setLinkedStoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              >
                <option value="none">None - General Research</option>
                {calendarStories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.story_title || story.news_peg || story.brand || 'Untitled'}{' '}
                    {story.brand ? `(${story.brand})` : ''}
                  </option>
                ))}
              </select>
              {isLoadingStories && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  Loading stories...
                </p>
              )}
              {storiesError && (
                <p className="text-xs text-amber-600 mt-1">{storiesError}</p>
              )}
            </div>

            {/* Competitor URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competitor URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlPaste(e.target.value)}
                  onPaste={(e) => {
                    setTimeout(() => handleUrlPaste(e.target.value), 0);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent pr-10"
                  placeholder="https://example.com/article-url"
                />
                {isScrapingUrl && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={18} className="animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              {scrapeError && (
                <p className="text-xs text-amber-600 mt-1">{scrapeError}</p>
              )}
              {isScrapingUrl && (
                <p className="text-xs text-gray-500 mt-1">
                  Auto-filling article details...
                </p>
              )}
            </div>

            {/* Article Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., Top 25 Dog Park Cities"
              />
            </div>

            {/* Publisher/Site Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher / Site Name
              </label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., TruGreen"
              />
            </div>

            {/* Publish Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publish Date
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              />
            </div>

            {/* Got News Coverage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Got News Coverage?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="coverage"
                    value="yes"
                    checked={gotCoverage === 'yes'}
                    onChange={(e) => setGotCoverage(e.target.value)}
                    className="text-ls-green focus:ring-ls-green"
                  />
                  <span className="text-sm text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="coverage"
                    value="no"
                    checked={gotCoverage === 'no'}
                    onChange={(e) => setGotCoverage(e.target.value)}
                    className="text-ls-green focus:ring-ls-green"
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="coverage"
                    value="not_sure"
                    checked={gotCoverage === 'not_sure'}
                    onChange={(e) => setGotCoverage(e.target.value)}
                    className="text-ls-green focus:ring-ls-green"
                  />
                  <span className="text-sm text-gray-700">Not Sure</span>
                </label>
              </div>
            </div>

            {/* Coverage Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coverage Notes
              </label>
              <textarea
                value={coverageNotes}
                onChange={(e) => setCoverageNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., NYT picked it up 3/15, local affiliates ran it"
              />
            </div>

            {/* Quality/Approach Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality/Approach Notes
              </label>
              <textarea
                value={qualityNotes}
                onChange={(e) => setQualityNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., Top 50 list, weak methodology, no graphics, dated 2023 data"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            <button
              onClick={handleSubmit}
              disabled={!url.trim() || isSaving}
              className="w-full px-4 py-2 bg-ls-green text-white font-medium rounded-lg hover:bg-ls-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {editingEntry ? 'Save Changes' : 'Add Competitor Piece'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Entry Card Component
  const EntryCard = ({ entry }) => {
    const linkedStory = getEntryStoryTitle(entry);
    const recent = isRecent(entry.publishDate, 60);

    return (
      <div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header: Publisher + Date + Recent badge */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {entry.publisher && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-ls-green-lighter rounded-full">
                  <Building2 size={12} className="text-ls-green" />
                  <span className="text-xs font-medium text-ls-green">
                    {entry.publisher}
                  </span>
                </div>
              )}
              {entry.publishDate && (
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Calendar size={12} />
                  {formatDate(entry.publishDate)}
                </div>
              )}
              {recent && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full">
                  <Flame size={12} className="text-orange-500" />
                  <span className="text-xs font-medium text-orange-600">
                    Recent
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 mb-1 truncate">
              {entry.title || 'Untitled Article'}
            </h3>

            {/* Coverage Status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">Coverage:</span>
              <CoverageBadge coverage={entry.gotCoverage} />
            </div>

            {/* Linked Story */}
            {linkedStory && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                <Link2 size={12} className="text-ls-green" />
                <span>Linked to: {linkedStory}</span>
              </div>
            )}

            {/* Notes preview */}
            {(entry.coverageNotes || entry.qualityNotes) && (
              <p className="text-xs text-gray-500 line-clamp-2">
                {entry.qualityNotes || entry.coverageNotes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              title="View Article"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={() => openNewsSearch(entry)}
              className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              title="Search News"
            >
              <Newspaper size={14} />
            </button>
            <button
              onClick={() => {
                setEditingEntry(entry);
                setShowAddModal(true);
              }}
              disabled={isSaving}
              className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => handleDeleteEntry(entry)}
              disabled={isSaving}
              className="flex items-center justify-center w-8 h-8 border border-red-300 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Table View Component
  const TableView = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Loader2 size={48} className="mx-auto text-ls-green mb-4 animate-spin" />
          <p className="text-gray-500">Loading competitor log from Google Sheets...</p>
        </div>
      );
    }

    if (filteredEntries.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No competitor pieces found.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
          >
            <Plus size={18} />
            Add Your First Entry
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Competitor Piece
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Published
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Coverage
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Linked Story
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Notes
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((entry) => {
                const linkedStory = getEntryStoryTitle(entry);
                const recent = isRecent(entry.publishDate, 60);

                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    {/* Competitor Piece */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {entry.publisher && (
                          <span className="px-2 py-0.5 bg-ls-green-lighter text-ls-green text-xs font-medium rounded-full">
                            {entry.publisher}
                          </span>
                        )}
                        <span className="font-medium text-gray-900 truncate max-w-[200px]">
                          {entry.title ? `"${entry.title}"` : 'Untitled'}
                        </span>
                      </div>
                    </td>

                    {/* Published */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                          {formatDate(entry.publishDate)}
                        </span>
                        {recent && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 rounded text-xs text-orange-600">
                            <Flame size={10} />
                            Recent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Coverage */}
                    <td className="px-4 py-3">
                      <CoverageBadge coverage={entry.gotCoverage} />
                    </td>

                    {/* Linked Story */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 truncate max-w-[150px] block">
                        {linkedStory || '-'}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 line-clamp-2 max-w-[200px]">
                        {entry.qualityNotes || entry.coverageNotes || '-'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="View Article"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => openNewsSearch(entry)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Search News"
                        >
                          <Newspaper size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEntry(entry);
                            setShowAddModal(true);
                          }}
                          disabled={isSaving}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry)}
                          disabled={isSaving}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitor Log</h1>
          <p className="text-sm text-gray-500">
            Track competitor articles and research for competitive analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent w-64"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters
                ? 'border-ls-green text-ls-green bg-ls-green-lighter'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={18} />
            Filters
            {(filterLinkedStory !== 'all' ||
              filterCoverage !== 'all' ||
              filterDateRange !== 'all') && (
              <span className="w-2 h-2 bg-ls-green rounded-full"></span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={() => {
              fetchStories();
              fetchEntries();
            }}
            disabled={isLoading || isLoadingStories}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh from Google Sheets"
          >
            <RefreshCw
              size={18}
              className={isLoading || isLoadingStories ? 'animate-spin' : ''}
            />
            Refresh
          </button>

          {/* Add Entry */}
          <button
            onClick={() => {
              setEditingEntry(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
          >
            <Plus size={18} />
            Add Competitor Piece
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter by Linked Story */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Linked Story
              </label>
              <select
                value={filterLinkedStory}
                onChange={(e) => setFilterLinkedStory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent text-sm"
              >
                <option value="all">All Stories</option>
                <option value="unlinked">Unlinked (General Research)</option>
                {linkedStoryOptions.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.story_title || story.news_peg || story.brand}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Coverage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coverage Status
              </label>
              <select
                value={filterCoverage}
                onChange={(e) => setFilterCoverage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent text-sm"
              >
                <option value="all">All</option>
                <option value="yes">Has Coverage</option>
                <option value="no">No Coverage</option>
                <option value="not_sure">Not Sure</option>
              </select>
            </div>

            {/* Filter by Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent text-sm"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="60days">Last 60 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="1year">Last Year</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(filterLinkedStory !== 'all' ||
            filterCoverage !== 'all' ||
            filterDateRange !== 'all') && (
            <div className="mt-3 pt-3 border-t">
              <button
                onClick={() => {
                  setFilterLinkedStory('all');
                  setFilterCoverage('all');
                  setFilterDateRange('all');
                }}
                className="text-sm text-ls-green hover:text-ls-green-light"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Insights */}
      {quickInsights && entries.length > 0 && (
        <div className="bg-gradient-to-r from-ls-green-lighter to-white rounded-xl border p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            Quick Insights
          </h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total logged:</span>{' '}
              <span className="font-semibold text-gray-900">
                {quickInsights.totalEntries} pieces
              </span>
            </div>
            {quickInsights.mostRecentDays !== null && (
              <div>
                <span className="text-gray-500">Most recent competitor piece:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {quickInsights.mostRecentDays === 0
                    ? 'Today'
                    : `${quickInsights.mostRecentDays} days ago`}
                </span>
              </div>
            )}
            {quickInsights.totalWithCoverageInfo > 0 && (
              <div>
                <span className="text-gray-500">Got news coverage:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {quickInsights.withCoverage} of {quickInsights.totalWithCoverageInfo}{' '}
                  ({Math.round(
                    (quickInsights.withCoverage / quickInsights.totalWithCoverageInfo) *
                      100
                  )}
                  %)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      {entries.length > 0 && !isLoading && (
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredEntries.length} of {entries.length} entries
        </div>
      )}

      {/* Entries Table */}
      <TableView />

      {/* Add/Edit Modal */}
      <AddEditModal />
    </div>
  );
}
