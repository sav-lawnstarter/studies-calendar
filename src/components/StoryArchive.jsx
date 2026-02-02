import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Eye,
  Calendar,
  Link2,
  BarChart2,
  AlertCircle,
  Loader2,
  Grid,
  List,
  X,
  TrendingUp,
  Mail,
  Users,
  Clock,
  FileText,
  MousePointerClick,
  Globe,
} from 'lucide-react';
import {
  getCachedArchive,
  scrapeAllCategoryPages,
  matchStudiesWithSheetData,
  getYearsFromStudies,
  extractYear,
  retryLawnLove,
  BRAND_STATUS,
} from '../utils/categoryScraper';
import {
  getStoredToken,
  authenticateWithGoogle,
  fetchSheetData,
  fetchContentCalendarData,
} from '../utils/googleSheets';
import {
  fetchSearchConsoleWithComparison,
  getPropertiesForBrand,
  formatNumber,
  formatPercent,
  formatPosition,
  getChangeClass,
  getChangeArrow,
} from '../utils/googleAnalytics';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function StoryArchive() {
  // Archive data state
  const [studies, setStudies] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  // Brand-specific status tracking
  const [brandStatus, setBrandStatus] = useState({
    lawnstarter: { status: BRAND_STATUS.IDLE, error: null },
    lawnlove: { status: BRAND_STATUS.IDLE, error: null },
  });
  const [isRetryingLawnLove, setIsRetryingLawnLove] = useState(false);

  // Google Sheets data (Study Story Data for metrics)
  const [sheetData, setSheetData] = useState([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  // Content Calendar data (to show which studies are already scheduled)
  const [contentCalendarData, setContentCalendarData] = useState([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [calendarFilter, setCalendarFilter] = useState('All'); // 'All', 'In Calendar', 'Not in Calendar'
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedStudy, setSelectedStudy] = useState(null);

  // Google Search Console data for modal
  const [gscData, setGscData] = useState(null);
  const [isLoadingGsc, setIsLoadingGsc] = useState(false);
  const [gscError, setGscError] = useState(null);

  // Get available years for filter
  const availableYears = useMemo(() => {
    return getYearsFromStudies(studies);
  }, [studies]);

  // Load cached data on mount
  useEffect(() => {
    const cached = getCachedArchive();
    if (cached) {
      setStudies(cached.studies);
      setLastUpdated(cached.timestamp);
    }
  }, []);

  // Load Google Sheet data for matching (both Study Story Data and Content Calendar)
  const loadSheetData = useCallback(async () => {
    let token = getStoredToken();

    if (!token) {
      try {
        token = await authenticateWithGoogle(clientId);
      } catch (err) {
        console.error('Auth error:', err);
        return;
      }
    }

    setIsLoadingSheet(true);
    setIsLoadingCalendar(true);

    // Fetch both sheets in parallel
    try {
      const [studyData, calendarData] = await Promise.all([
        fetchSheetData(token).catch(err => {
          console.error('Error loading study sheet data:', err);
          return [];
        }),
        fetchContentCalendarData(token).catch(err => {
          console.error('Error loading content calendar data:', err);
          return [];
        }),
      ]);

      setSheetData(studyData);
      setContentCalendarData(calendarData);
    } catch (err) {
      console.error('Error loading sheet data:', err);
    } finally {
      setIsLoadingSheet(false);
      setIsLoadingCalendar(false);
    }
  }, []);

  // Load sheet data on mount
  useEffect(() => {
    loadSheetData();
  }, [loadSheetData]);

  // Fetch Google Search Console data when a study is selected
  const fetchGscData = useCallback(async (study) => {
    if (!study || !study.url) return;

    const { gscProperty } = getPropertiesForBrand(study.brand);
    if (!gscProperty) {
      setGscError('Search Console not configured for this brand');
      return;
    }

    let token = getStoredToken();
    if (!token) {
      try {
        token = await authenticateWithGoogle(clientId);
      } catch (err) {
        setGscError('Authentication required');
        return;
      }
    }

    setIsLoadingGsc(true);
    setGscError(null);

    try {
      const data = await fetchSearchConsoleWithComparison(token, gscProperty, study.url);
      setGscData(data);
    } catch (err) {
      console.error('Error fetching GSC data:', err);
      setGscError(err.message || 'Failed to load Search Console data');
      setGscData(null);
    } finally {
      setIsLoadingGsc(false);
    }
  }, []);

  // Load GSC data when a study is selected
  useEffect(() => {
    if (selectedStudy) {
      setGscData(null);
      setGscError(null);
      fetchGscData(selectedStudy);
    }
  }, [selectedStudy, fetchGscData]);

  // Helper to normalize URLs for comparison
  const normalizeUrl = (url) => {
    if (!url) return '';
    return url.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  };

  // Match studies with sheet data and content calendar when either changes
  const matchedStudies = useMemo(() => {
    if (studies.length === 0) return [];

    // First match with Study Story Data for metrics
    const withMetrics = matchStudiesWithSheetData(studies, sheetData);

    // Then match with Content Calendar to see which are scheduled
    return withMetrics.map(study => {
      const normalizedStudyUrl = normalizeUrl(study.url);

      // Find matching entry in Content Calendar by URL
      const calendarEntry = contentCalendarData.find(entry => {
        const normalizedCalendarUrl = normalizeUrl(entry.study_url);
        return normalizedCalendarUrl && normalizedStudyUrl &&
          (normalizedCalendarUrl.includes(normalizedStudyUrl) ||
           normalizedStudyUrl.includes(normalizedCalendarUrl));
      });

      if (calendarEntry) {
        return {
          ...study,
          inContentCalendar: true,
          calendarEntry: {
            storyTitle: calendarEntry.story_title,
            brand: calendarEntry.brand,
            pitchDate: calendarEntry.pitch_date,
            status: calendarEntry.status,
            productionDate: calendarEntry.production_date,
          },
        };
      }

      return { ...study, inContentCalendar: false };
    });
  }, [studies, sheetData, contentCalendarData]);

  // Filter and sort studies
  const filteredStudies = useMemo(() => {
    let result = [...matchedStudies];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (study) =>
          study.title.toLowerCase().includes(query) ||
          (study.excerpt && study.excerpt.toLowerCase().includes(query)) ||
          study.url.toLowerCase().includes(query)
      );
    }

    // Brand filter
    if (brandFilter !== 'All') {
      result = result.filter((study) => study.brand === brandFilter);
    }

    // Year filter
    if (yearFilter !== 'All') {
      result = result.filter((study) => {
        const year = extractYear(study.publishDate);
        return year === parseInt(yearFilter);
      });
    }

    // Calendar filter
    if (calendarFilter === 'In Calendar') {
      result = result.filter((study) => study.inContentCalendar);
    } else if (calendarFilter === 'Not in Calendar') {
      result = result.filter((study) => !study.inContentCalendar);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => {
          if (!a.publishDate && !b.publishDate) return 0;
          if (!a.publishDate) return 1;
          if (!b.publishDate) return -1;
          return new Date(b.publishDate) - new Date(a.publishDate);
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          if (!a.publishDate && !b.publishDate) return 0;
          if (!a.publishDate) return 1;
          if (!b.publishDate) return -1;
          return new Date(a.publishDate) - new Date(b.publishDate);
        });
        break;
      case 'links':
        result.sort((a, b) => {
          const aLinks = parseInt(a.studyLinkNumber) || 0;
          const bLinks = parseInt(b.studyLinkNumber) || 0;
          return bLinks - aLinks;
        });
        break;
      case 'performance':
        result.sort((a, b) => {
          const aPerf = parseFloat(a.avgOpenRate) || 0;
          const bPerf = parseFloat(b.avgOpenRate) || 0;
          return bPerf - aPerf;
        });
        break;
      default:
        break;
    }

    return result;
  }, [matchedStudies, searchQuery, brandFilter, yearFilter, calendarFilter, sortBy]);

  // Handle brand status updates
  const handleBrandStatus = (brand, status, errorMsg = null) => {
    setBrandStatus(prev => ({
      ...prev,
      [brand]: { status, error: errorMsg },
    }));
  };

  // Refresh archive (re-scrape category pages)
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    setWarning(null);
    setLoadingMessage('Starting scrape...');

    // Reset brand status
    setBrandStatus({
      lawnstarter: { status: BRAND_STATUS.LOADING, error: null },
      lawnlove: { status: BRAND_STATUS.LOADING, error: null },
    });

    try {
      const result = await scrapeAllCategoryPages(
        (msg) => setLoadingMessage(msg),
        handleBrandStatus
      );

      setStudies(result.studies);
      setLastUpdated(result.timestamp);
      setLoadingMessage('');

      // Update brand status from results
      if (result.brandResults) {
        setBrandStatus({
          lawnstarter: {
            status: result.brandResults.lawnstarter.status,
            error: result.brandResults.lawnstarter.error,
          },
          lawnlove: {
            status: result.brandResults.lawnlove.status,
            error: result.brandResults.lawnlove.error,
          },
        });
      }

      // Show warning if some sources had issues but we still got results
      if (result.warnings && result.warnings.length > 0) {
        setWarning(`Some sources had issues: ${result.warnings.join(', ')}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh archive');
      setLoadingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  // Retry fetching only Lawn Love studies
  const handleRetryLawnLove = async () => {
    setIsRetryingLawnLove(true);
    setWarning(null);

    try {
      const result = await retryLawnLove(
        studies,
        (msg) => setLoadingMessage(msg),
        handleBrandStatus
      );

      if (result.success) {
        setStudies(result.studies);
        setLastUpdated(result.timestamp);
        setLoadingMessage('');
      } else {
        setWarning(`Lawn Love retry failed: ${result.error}`);
      }
    } catch (err) {
      setWarning(`Lawn Love retry failed: ${err.message}`);
    } finally {
      setIsRetryingLawnLove(false);
      setLoadingMessage('');
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  // Brand badge component
  const BrandBadge = ({ brand }) => {
    const colors = {
      LawnStarter: 'bg-ls-green text-white',
      'Lawn Love': 'bg-pink-500 text-white',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[brand] || 'bg-gray-500 text-white'}`}
      >
        {brand}
      </span>
    );
  };

  // Study card component (grid view)
  const StudyCard = ({ study }) => (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      {study.image ? (
        <div className="h-40 bg-gray-100 overflow-hidden">
          <img
            src={study.image}
            alt={study.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-ls-green-lighter to-ls-green/10 flex items-center justify-center">
          <FileText size={48} className="text-ls-green/30" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <BrandBadge brand={study.brand} />
          {study.inContentCalendar && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-ls-green text-white">
              In Calendar
            </span>
          )}
          {study.hasSheetData && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Has Metrics
            </span>
          )}
        </div>

        <a
          href={study.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-2 group"
        >
          <h3 className="font-semibold text-gray-900 group-hover:text-ls-green transition-colors line-clamp-2">
            {study.title}
          </h3>
        </a>

        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Calendar size={14} />
          {formatDate(study.publishDate)}
        </div>

        {/* Performance metrics */}
        {study.hasSheetData && (
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            {study.studyLinkNumber && (
              <span className="flex items-center gap-1 text-gray-600">
                <Link2 size={12} />
                {study.studyLinkNumber} links
              </span>
            )}
            {study.avgOpenRate && (
              <span className="flex items-center gap-1 text-gray-600">
                <BarChart2 size={12} />
                O/R: {study.avgOpenRate}%
              </span>
            )}
            {study.avgClickRate && (
              <span className="flex items-center gap-1 text-gray-600">
                <TrendingUp size={12} />
                C/R: {study.avgClickRate}%
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedStudy(study)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            <Eye size={14} />
            View Details
          </button>
          <a
            href={study.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-ls-green hover:bg-ls-green-light rounded-lg text-white transition-colors"
            title="Open study"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );

  // Study row component (list view)
  const StudyRow = ({ study }) => (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {study.image ? (
            <img
              src={study.image}
              alt=""
              className="w-12 h-12 rounded object-cover bg-gray-100"
              onError={(e) => {
                e.target.src = '';
                e.target.className = 'w-12 h-12 rounded bg-gray-100';
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded bg-gradient-to-br from-ls-green-lighter to-ls-green/10 flex items-center justify-center">
              <FileText size={20} className="text-ls-green/30" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <a
              href={study.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-900 hover:text-ls-green transition-colors block truncate"
            >
              {study.title}
            </a>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <BrandBadge brand={study.brand} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {formatDate(study.publishDate)}
      </td>
      <td className="px-4 py-3">
        {study.inContentCalendar ? (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-ls-green text-white">
            In Calendar
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {study.studyLinkNumber ? (
          <span className="text-sm font-medium text-gray-900">
            {study.studyLinkNumber}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {study.avgOpenRate ? (
          <span className="text-sm font-medium text-gray-900">
            {study.avgOpenRate}%
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {study.avgClickRate ? (
          <span className="text-sm font-medium text-gray-900">
            {study.avgClickRate}%
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setSelectedStudy(study)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye size={16} className="text-gray-600" />
          </button>
          <a
            href={study.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Open study"
          >
            <ExternalLink size={16} className="text-gray-600" />
          </a>
        </div>
      </td>
    </tr>
  );

  // Study detail modal
  const StudyDetailModal = () => {
    if (!selectedStudy) return null;

    // Find similar studies (same brand, different study)
    const similarStudies = matchedStudies
      .filter(
        (s) =>
          s.brand === selectedStudy.brand &&
          s.id !== selectedStudy.id &&
          s.url !== selectedStudy.url
      )
      .slice(0, 3);

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={() => setSelectedStudy(null)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-ls-green p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <BrandBadge brand={selectedStudy.brand} />
                  {selectedStudy.inContentCalendar && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-ls-green">
                      In Calendar
                    </span>
                  )}
                  {selectedStudy.hasSheetData && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      Has Metrics
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{selectedStudy.title}</h2>
                <p className="text-white/80 text-sm mt-1">
                  Published: {formatDate(selectedStudy.publishDate)}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudy(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Study URL */}
            <div className="mb-6">
              <a
                href={selectedStudy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-ls-green hover:text-ls-green-light transition-colors"
              >
                <ExternalLink size={16} />
                <span className="underline break-all">{selectedStudy.url}</span>
              </a>
            </div>

            {/* Excerpt if available */}
            {selectedStudy.excerpt && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Excerpt
                </h3>
                <p className="text-gray-700">{selectedStudy.excerpt}</p>
              </div>
            )}

            {/* Content Calendar Status */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Content Calendar
              </h3>
              {selectedStudy.inContentCalendar ? (
                <div className="bg-ls-green-lighter rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={18} className="text-ls-green" />
                    <span className="font-medium text-ls-green">This study is in the Content Calendar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedStudy.calendarEntry?.storyTitle && (
                      <div>
                        <span className="text-gray-500">Story Title:</span>
                        <p className="font-medium text-gray-900">{selectedStudy.calendarEntry.storyTitle}</p>
                      </div>
                    )}
                    {selectedStudy.calendarEntry?.pitchDate && (
                      <div>
                        <span className="text-gray-500">Pitch Date:</span>
                        <p className="font-medium text-gray-900">{formatDate(selectedStudy.calendarEntry.pitchDate)}</p>
                      </div>
                    )}
                    {selectedStudy.calendarEntry?.status && (
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <p className="font-medium text-gray-900">{selectedStudy.calendarEntry.status}</p>
                      </div>
                    )}
                    {selectedStudy.calendarEntry?.productionDate && (
                      <div>
                        <span className="text-gray-500">Production Date:</span>
                        <p className="font-medium text-gray-900">{formatDate(selectedStudy.calendarEntry.productionDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-500 mb-3">
                    This study is not yet in the Content Calendar.
                  </p>
                  <a
                    href="https://docs.google.com/spreadsheets/d/1ELXVk6Zu9U3ISiv7zQM0rf9GCi_v2OrRzNat9cKGw7M/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
                  >
                    <ExternalLink size={16} />
                    Add to Content Calendar
                  </a>
                </div>
              )}
            </div>

            {/* Search Performance (Google Search Console) */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Search Performance
                <span className="text-xs font-normal text-gray-400 ml-2">(Last 28 days)</span>
              </h3>
              {isLoadingGsc ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Loader2 size={24} className="animate-spin text-ls-green mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading Search Console data...</p>
                </div>
              ) : gscError ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 text-center text-sm">
                    {gscError}
                  </p>
                  <button
                    onClick={() => fetchGscData(selectedStudy)}
                    className="mt-2 mx-auto block text-ls-green hover:text-ls-green-light text-sm font-medium"
                  >
                    Try again
                  </button>
                </div>
              ) : gscData ? (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Clicks */}
                    <div className="bg-ls-green-lighter rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-ls-green mb-1">
                        <MousePointerClick size={16} />
                      </div>
                      <p className="text-2xl font-bold text-ls-green">
                        {formatNumber(gscData.current.clicks)}
                      </p>
                      <p className="text-xs text-gray-600">Clicks</p>
                      {gscData.comparison.clicksChange !== null && (
                        <p className={`text-xs mt-1 ${getChangeClass(gscData.comparison.clicksChange)}`}>
                          {getChangeArrow(gscData.comparison.clicksChange)}{gscData.comparison.clicksChange}% YoY
                        </p>
                      )}
                    </div>
                    {/* Impressions */}
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Eye size={16} />
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatNumber(gscData.current.impressions)}
                      </p>
                      <p className="text-xs text-gray-600">Impressions</p>
                      {gscData.comparison.impressionsChange !== null && (
                        <p className={`text-xs mt-1 ${getChangeClass(gscData.comparison.impressionsChange)}`}>
                          {getChangeArrow(gscData.comparison.impressionsChange)}{gscData.comparison.impressionsChange}% YoY
                        </p>
                      )}
                    </div>
                    {/* CTR */}
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                        <TrendingUp size={16} />
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatPercent(gscData.current.ctr)}
                      </p>
                      <p className="text-xs text-gray-600">CTR</p>
                      {gscData.comparison.ctrChange !== null && (
                        <p className={`text-xs mt-1 ${getChangeClass(gscData.comparison.ctrChange)}`}>
                          {getChangeArrow(gscData.comparison.ctrChange)}{gscData.comparison.ctrChange}% YoY
                        </p>
                      )}
                    </div>
                    {/* Average Position */}
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                        <Globe size={16} />
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatPosition(gscData.current.position)}
                      </p>
                      <p className="text-xs text-gray-600">Avg Position</p>
                      {gscData.comparison.positionChange !== null && (
                        <p className={`text-xs mt-1 ${getChangeClass(gscData.comparison.positionChange, true)}`}>
                          {parseFloat(gscData.comparison.positionChange) > 0 ? '+' : ''}{gscData.comparison.positionChange} pos YoY
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Last year comparison row */}
                  <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-gray-500 px-1">
                    <div className="text-center">Last yr: {formatNumber(gscData.lastYear.clicks)}</div>
                    <div className="text-center">Last yr: {formatNumber(gscData.lastYear.impressions)}</div>
                    <div className="text-center">Last yr: {formatPercent(gscData.lastYear.ctr)}</div>
                    <div className="text-center">Last yr: {formatPosition(gscData.lastYear.position)}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 text-center text-sm">
                    No Search Console data available.
                  </p>
                </div>
              )}
            </div>

            {/* Performance Data */}
            {selectedStudy.hasSheetData ? (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Performance Data
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedStudy.studyLinkNumber && (
                    <div className="bg-ls-green-lighter rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-ls-green mb-1">
                        <Link2 size={16} />
                      </div>
                      <p className="text-2xl font-bold text-ls-green">
                        {selectedStudy.studyLinkNumber}
                      </p>
                      <p className="text-xs text-gray-600">Links</p>
                    </div>
                  )}
                  {selectedStudy.avgOpenRate && (
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <BarChart2 size={16} />
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedStudy.avgOpenRate}%
                      </p>
                      <p className="text-xs text-gray-600">Avg O/R</p>
                    </div>
                  )}
                  {selectedStudy.avgClickRate && (
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                        <TrendingUp size={16} />
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedStudy.avgClickRate}%
                      </p>
                      <p className="text-xs text-gray-600">Avg C/R</p>
                    </div>
                  )}
                  {selectedStudy.prevLinkNumber && (
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                        <Clock size={16} />
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        {selectedStudy.prevLinkNumber}
                      </p>
                      <p className="text-xs text-gray-600">Prev. Links</p>
                    </div>
                  )}
                </div>

                {/* Additional metrics */}
                {(selectedStudy.expertsContacted ||
                  selectedStudy.expertResponses ||
                  selectedStudy.doFollowLinks ||
                  selectedStudy.noFollowLinks) && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {selectedStudy.expertsContacted && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users size={14} />
                        <span>Experts Contacted: {selectedStudy.expertsContacted}</span>
                      </div>
                    )}
                    {selectedStudy.expertResponses && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} />
                        <span>Expert Responses: {selectedStudy.expertResponses}</span>
                      </div>
                    )}
                    {selectedStudy.doFollowLinks && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Link2 size={14} />
                        <span>DoFollow: {selectedStudy.doFollowLinks}</span>
                      </div>
                    )}
                    {selectedStudy.noFollowLinks && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Link2 size={14} />
                        <span>NoFollow: {selectedStudy.noFollowLinks}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selectedStudy.notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                      {selectedStudy.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-center">
                  No performance data available for this study.
                  <br />
                  <span className="text-sm">
                    Add this URL to the Study Story Data sheet to track metrics.
                  </span>
                </p>
              </div>
            )}

            {/* Similar Studies */}
            {similarStudies.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Other {selectedStudy.brand} Studies
                </h3>
                <div className="space-y-2">
                  {similarStudies.map((study) => (
                    <button
                      key={study.id}
                      onClick={() => setSelectedStudy(study)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {study.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(study.publishDate)}
                        {study.studyLinkNumber && ` • ${study.studyLinkNumber} links`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-between gap-3">
            <button
              onClick={() => loadSheetData()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isLoadingSheet}
            >
              <RefreshCw size={16} className={isLoadingSheet ? 'animate-spin' : ''} />
              Refresh Metrics
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedStudy(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <a
                href={selectedStudy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
              >
                <ExternalLink size={16} />
                Open Study
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Story Archive</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {formatTimestamp(lastUpdated)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://docs.google.com/spreadsheets/d/1ELXVk6Zu9U3ISiv7zQM0rf9GCi_v2OrRzNat9cKGw7M/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-ls-green text-ls-green rounded-lg hover:bg-ls-green-lighter transition-colors"
          >
            <ExternalLink size={18} />
            Open Content Calendar
          </a>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Refreshing...' : 'Refresh Archive'}
          </button>
        </div>
      </div>

      {/* Loading message */}
      {isLoading && loadingMessage && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span className="text-blue-700">{loadingMessage}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600" />
          <span className="text-red-700 whitespace-pre-wrap">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Warning message */}
      {warning && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-yellow-600" />
          <span className="text-yellow-700">{warning}</span>
          <button
            onClick={() => setWarning(null)}
            className="ml-auto text-yellow-600 hover:text-yellow-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Brand Status Banner - shows when Lawn Love failed but LawnStarter succeeded */}
      {brandStatus.lawnlove.status === BRAND_STATUS.ERROR &&
       brandStatus.lawnstarter.status === BRAND_STATUS.SUCCESS && (
        <div className="mb-4 p-4 bg-pink-50 border border-pink-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <AlertCircle size={20} className="text-pink-600" />
              </div>
              <div>
                <p className="font-medium text-pink-900">Lawn Love studies unavailable</p>
                <p className="text-sm text-pink-700">
                  {brandStatus.lawnlove.error || 'CORS proxy issues prevented loading Lawn Love studies'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRetryLawnLove}
              disabled={isRetryingLawnLove}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={isRetryingLawnLove ? 'animate-spin' : ''} />
              {isRetryingLawnLove ? 'Retrying...' : 'Click to retry'}
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-pink-200">
            <p className="text-xs text-pink-600">
              LawnStarter studies are displayed below. You can also visit{' '}
              <a
                href="https://lawnlove.com/blog/category/studies/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-pink-800"
              >
                Lawn Love studies directly
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* Brand Status Indicators - shows loading state for each brand */}
      {isLoading && (
        <div className="mb-4 flex gap-4">
          <div className={`flex-1 p-3 rounded-lg border ${
            brandStatus.lawnstarter.status === BRAND_STATUS.LOADING
              ? 'bg-green-50 border-green-200'
              : brandStatus.lawnstarter.status === BRAND_STATUS.SUCCESS
              ? 'bg-green-100 border-green-300'
              : brandStatus.lawnstarter.status === BRAND_STATUS.ERROR
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              {brandStatus.lawnstarter.status === BRAND_STATUS.LOADING && (
                <Loader2 size={16} className="animate-spin text-green-600" />
              )}
              {brandStatus.lawnstarter.status === BRAND_STATUS.SUCCESS && (
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">&#10003;</span>
                </div>
              )}
              {brandStatus.lawnstarter.status === BRAND_STATUS.ERROR && (
                <AlertCircle size={16} className="text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                brandStatus.lawnstarter.status === BRAND_STATUS.ERROR ? 'text-red-700' : 'text-green-700'
              }`}>
                LawnStarter
              </span>
            </div>
          </div>
          <div className={`flex-1 p-3 rounded-lg border ${
            brandStatus.lawnlove.status === BRAND_STATUS.LOADING
              ? 'bg-pink-50 border-pink-200'
              : brandStatus.lawnlove.status === BRAND_STATUS.SUCCESS
              ? 'bg-pink-100 border-pink-300'
              : brandStatus.lawnlove.status === BRAND_STATUS.ERROR
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              {brandStatus.lawnlove.status === BRAND_STATUS.LOADING && (
                <Loader2 size={16} className="animate-spin text-pink-600" />
              )}
              {brandStatus.lawnlove.status === BRAND_STATUS.SUCCESS && (
                <div className="w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">&#10003;</span>
                </div>
              )}
              {brandStatus.lawnlove.status === BRAND_STATUS.ERROR && (
                <AlertCircle size={16} className="text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                brandStatus.lawnlove.status === BRAND_STATUS.ERROR ? 'text-red-700' : 'text-pink-700'
              }`}>
                Lawn Love
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by title, topic, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            />
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Brands</option>
              <option value="LawnStarter">LawnStarter</option>
              <option value="Lawn Love">Lawn Love</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Year Filter */}
          <div className="relative">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Calendar Filter */}
          <div className="relative">
            <select
              value={calendarFilter}
              onChange={(e) => setCalendarFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Studies</option>
              <option value="In Calendar">In Calendar</option>
              <option value="Not in Calendar">Not in Calendar</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="links">Most Links</option>
              <option value="performance">Highest Performance</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-ls-green text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Grid view"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-ls-green text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-500 flex items-center gap-4 flex-wrap">
          <span>
            Showing {filteredStudies.length} of {matchedStudies.length} studies
            {matchedStudies.filter(s => s.inContentCalendar).length > 0 && (
              <span className="ml-1 text-ls-green">
                ({matchedStudies.filter(s => s.inContentCalendar).length} in calendar)
              </span>
            )}
          </span>
          {/* Brand counts */}
          <span className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-ls-green-lighter text-ls-green rounded text-xs">
              {matchedStudies.filter(s => s.brand === 'LawnStarter').length} LawnStarter
            </span>
            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs">
              {matchedStudies.filter(s => s.brand === 'Lawn Love').length} Lawn Love
            </span>
          </span>
          {(isLoadingSheet || isLoadingCalendar) && (
            <span className="text-blue-600">
              <Loader2 size={12} className="inline animate-spin mr-1" />
              {isLoadingSheet && isLoadingCalendar ? 'Loading data...' :
               isLoadingSheet ? 'Loading metrics...' : 'Loading calendar...'}
            </span>
          )}
        </div>
      </div>

      {/* Empty State */}
      {matchedStudies.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No archived studies found
          </h3>
          <p className="text-gray-500 mb-6">
            Click "Refresh Archive" to load studies from category pages.
          </p>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
          >
            <RefreshCw size={18} />
            Refresh Archive
          </button>
        </div>
      )}

      {/* No results after filtering */}
      {matchedStudies.length > 0 && filteredStudies.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No studies match your filters
          </h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setBrandFilter('All');
              setYearFilter('All');
              setCalendarFilter('All');
            }}
            className="text-ls-green hover:text-ls-green-light font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredStudies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudies.map((study) => (
            <StudyCard key={study.id} study={study} />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredStudies.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Brand
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Published
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Calendar
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-1">
                    <Link2 size={14} /> Links
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-1">
                    <BarChart2 size={14} /> Avg O/R
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={14} /> Avg C/R
                  </span>
                </th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudies.map((study) => (
                <StudyRow key={study.id} study={study} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Study Detail Modal */}
      <StudyDetailModal />
    </div>
  );
}
