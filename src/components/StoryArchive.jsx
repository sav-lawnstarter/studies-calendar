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
  TrendingDown,
  Mail,
  Users,
  Clock,
  FileText,
  MousePointerClick,
  Globe,
  Activity,
  Timer,
  ArrowDown,
  ArrowUp,
  MapPin,
  Share2,
  MessageSquare,
  Send,
  Target,
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
  batchFetchSearchConsoleMetrics,
  fetchGA4MetricsForUrl,
  fetchGA4ReaderInsightsForUrl,
  getPropertiesForBrand,
  formatNumber,
  formatPercent,
  formatPosition,
  formatEngagementTime,
  getChangeClass,
  getChangeArrow,
} from '../utils/googleAnalytics';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Local storage key for archive comments
const ARCHIVE_COMMENTS_STORAGE_KEY = 'story-archive-comments';

// Helper to parse numbers that may contain commas (e.g., "1,174" -> 1174)
const parseNumberWithCommas = (value) => {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

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
  const [pitchedFilter, setPitchedFilter] = useState('All'); // 'All', 'Pitched', 'Not Pitched'
  const [metricsFilter, setMetricsFilter] = useState('All'); // 'All', 'Has Metrics', 'No Metrics'
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Comments state (saved to localStorage)
  const [archiveComments, setArchiveComments] = useState(() => {
    try {
      const stored = localStorage.getItem(ARCHIVE_COMMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Google Search Console data for modal
  const [gscData, setGscData] = useState(null);
  const [isLoadingGsc, setIsLoadingGsc] = useState(false);
  const [gscError, setGscError] = useState(null);

  // GSC summary data for cards (URL -> metrics map)
  const [gscSummaryData, setGscSummaryData] = useState({});
  const [isLoadingGscSummary, setIsLoadingGscSummary] = useState(false);

  // Google Analytics 4 data for modal
  const [ga4Data, setGa4Data] = useState(null);
  const [ga4Insights, setGa4Insights] = useState(null);
  const [isLoadingGa4, setIsLoadingGa4] = useState(false);
  const [ga4Error, setGa4Error] = useState(null);

  // Save comments to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(ARCHIVE_COMMENTS_STORAGE_KEY, JSON.stringify(archiveComments));
  }, [archiveComments]);

  const updateArchiveComment = useCallback((studyId, comment) => {
    setArchiveComments(prev => ({
      ...prev,
      [studyId]: comment,
    }));
  }, []);

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

  // Fetch GSC summary data for all studies (for card display)
  const loadGscSummaryData = useCallback(async () => {
    if (studies.length === 0) return;

    let token = getStoredToken();
    if (!token) {
      try {
        token = await authenticateWithGoogle(clientId);
      } catch (err) {
        console.error('Auth error for GSC summary:', err);
        return;
      }
    }

    setIsLoadingGscSummary(true);
    try {
      const summaryData = await batchFetchSearchConsoleMetrics(token, studies);
      setGscSummaryData(summaryData);
    } catch (err) {
      console.error('Error loading GSC summary data:', err);
    } finally {
      setIsLoadingGscSummary(false);
    }
  }, [studies]);

  // Load GSC summary data when studies are loaded
  useEffect(() => {
    if (studies.length > 0) {
      loadGscSummaryData();
    }
  }, [studies, loadGscSummaryData]);

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

  // Fetch Google Analytics 4 data when a study is selected
  const fetchGa4Data = useCallback(async (study) => {
    if (!study || !study.url) return;

    const { ga4Property } = getPropertiesForBrand(study.brand);
    if (!ga4Property) {
      setGa4Error('Google Analytics not configured for this brand');
      return;
    }

    let token = getStoredToken();
    if (!token) {
      try {
        token = await authenticateWithGoogle(clientId);
      } catch (err) {
        setGa4Error('Authentication required');
        return;
      }
    }

    setIsLoadingGa4(true);
    setGa4Error(null);

    try {
      // Fetch both metrics and insights in parallel
      const [metrics, insights] = await Promise.all([
        fetchGA4MetricsForUrl(token, ga4Property, study.url),
        fetchGA4ReaderInsightsForUrl(token, ga4Property, study.url),
      ]);
      setGa4Data(metrics);
      setGa4Insights(insights);
    } catch (err) {
      console.error('Error fetching GA4 data:', err);
      setGa4Error(err.message || 'Failed to load Analytics data');
      setGa4Data(null);
      setGa4Insights(null);
    } finally {
      setIsLoadingGa4(false);
    }
  }, []);

  // Load GSC and GA4 data when a study is selected
  useEffect(() => {
    if (selectedStudy) {
      setGscData(null);
      setGscError(null);
      setGa4Data(null);
      setGa4Insights(null);
      setGa4Error(null);
      fetchGscData(selectedStudy);
      fetchGa4Data(selectedStudy);
    }
  }, [selectedStudy, fetchGscData, fetchGa4Data]);

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

    // Pitched filter
    if (pitchedFilter === 'Pitched') {
      result = result.filter((study) => study.datePitched);
    } else if (pitchedFilter === 'Not Pitched') {
      result = result.filter((study) => !study.datePitched);
    }

    // Metrics filter
    if (metricsFilter === 'Has Metrics') {
      result = result.filter((study) => study.hasSheetData);
    } else if (metricsFilter === 'No Metrics') {
      result = result.filter((study) => !study.hasSheetData);
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
          const aLinks = parseNumberWithCommas(a.studyLinkNumber);
          const bLinks = parseNumberWithCommas(b.studyLinkNumber);
          return bLinks - aLinks;
        });
        break;
      case 'impressions':
        result.sort((a, b) => {
          const aImpr = gscSummaryData[a.url]?.impressions || 0;
          const bImpr = gscSummaryData[b.url]?.impressions || 0;
          return bImpr - aImpr;
        });
        break;
      case 'position':
        result.sort((a, b) => {
          const aPos = gscSummaryData[a.url]?.position || 999;
          const bPos = gscSummaryData[b.url]?.position || 999;
          return aPos - bPos;
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
  }, [matchedStudies, searchQuery, brandFilter, yearFilter, calendarFilter, pitchedFilter, metricsFilter, sortBy, gscSummaryData]);

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
      'Lawn Love': 'bg-ls-green-dark text-white',
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
  const StudyCard = ({ study }) => {
    const gscMetrics = gscSummaryData[study.url];

    return (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <BrandBadge brand={study.brand} />
            {study.inContentCalendar && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-ls-green text-white">
                In Calendar
              </span>
            )}
            {study.datePitched && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 flex items-center gap-1">
                <Send size={10} />
                Pitched
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

          {/* Search Performance Overview */}
          {gscMetrics && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <Eye size={12} />
                  <span className="text-xs font-medium">Impressions</span>
                </div>
                <p className="text-sm font-semibold text-blue-700">
                  {formatNumber(gscMetrics.impressions)}
                </p>
                {gscMetrics.impressionsChange !== null && gscMetrics.impressionsChange !== undefined && (
                  <p className={`text-xs mt-0.5 flex items-center justify-center gap-0.5 ${parseFloat(gscMetrics.impressionsChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(gscMetrics.impressionsChange) >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                    {Math.abs(parseFloat(gscMetrics.impressionsChange))}% YoY
                  </p>
                )}
              </div>
              <div className="bg-orange-50 rounded-lg p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                  <Globe size={12} />
                  <span className="text-xs font-medium">Avg Position</span>
                </div>
                <p className="text-sm font-semibold text-orange-700">
                  {formatPosition(gscMetrics.position)}
                </p>
              </div>
            </div>
          )}

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
              onClick={() => { setSelectedStudy(study); setActiveDetailTab('overview'); }}
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
  };

  // Study row component (list view)
  const StudyRow = ({ study }) => {
    const gscMetrics = gscSummaryData[study.url];

    return (
      <tr className="border-b hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <a
            href={study.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-900 hover:text-ls-green transition-colors block truncate max-w-sm"
          >
            {study.title}
          </a>
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
        {gscMetrics?.impressions ? (
          <span className="text-sm font-medium text-blue-700">
            {formatNumber(gscMetrics.impressions)}
            {gscMetrics.impressionsChange !== null && gscMetrics.impressionsChange !== undefined && (
              <span className={`ml-1 text-xs ${parseFloat(gscMetrics.impressionsChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {parseFloat(gscMetrics.impressionsChange) >= 0 ? '\u2191' : '\u2193'}{Math.abs(parseFloat(gscMetrics.impressionsChange))}%
              </span>
            )}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {gscMetrics?.position ? (
          <span className="text-sm font-medium text-orange-700">
            {formatPosition(gscMetrics.position)}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => { setSelectedStudy(study); setActiveDetailTab('overview'); }}
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
  };

  // Study detail modal with tabs
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
      .slice(0, 5);

    // Parse links by year
    const linksByYear = [
      { year: '2025', count: parseNumberWithCommas(selectedStudy.links2025) },
      { year: '2024', count: parseNumberWithCommas(selectedStudy.links2024) },
      { year: '2023', count: parseNumberWithCommas(selectedStudy.links2023) },
      { year: '2022', count: parseNumberWithCommas(selectedStudy.links2022) },
      { year: '2021', count: parseNumberWithCommas(selectedStudy.links2021) },
    ];
    const totalLinksFromYears = parseNumberWithCommas(selectedStudy.studyLinkNumber);
    const maxYearLinks = Math.max(...linksByYear.map(l => l.count), 1);

    const tabs = [
      { id: 'overview', label: 'Overview', icon: BarChart2 },
      { id: 'pitch', label: 'Pitch & Outreach', icon: Send },
      { id: 'links', label: 'Links', icon: Link2 },
      { id: 'related', label: 'Related & Notes', icon: MessageSquare },
    ];

    // Generate a stable ID for comments keyed on study URL
    const commentKey = selectedStudy.url || selectedStudy.id;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={() => setSelectedStudy(null)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-ls-green p-6 text-white flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <BrandBadge brand={selectedStudy.brand} />
                  {selectedStudy.inContentCalendar && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-ls-green">
                      In Calendar
                    </span>
                  )}
                  {selectedStudy.datePitched && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white flex items-center gap-1">
                      <Send size={10} />
                      Pitched {formatDate(selectedStudy.datePitched)}
                    </span>
                  )}
                  {selectedStudy.hasSheetData && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      Has Metrics
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{selectedStudy.title}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-white/80 text-sm">
                    Published: {formatDate(selectedStudy.publishDate)}
                  </p>
                  <a
                    href={selectedStudy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white text-sm flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink size={12} />
                    View Study
                  </a>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudy(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b bg-white flex-shrink-0">
            <div className="flex">
              {tabs.map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeDetailTab === tab.id
                        ? 'border-ls-green text-ls-green'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <TabIcon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* ===== OVERVIEW TAB ===== */}
            {activeDetailTab === 'overview' && (
              <div className="space-y-6">
                {/* Excerpt if available */}
                {selectedStudy.excerpt && (
                  <div>
                    <p className="text-gray-700 text-sm">{selectedStudy.excerpt}</p>
                  </div>
                )}

                {/* Search Performance (Google Search Console) */}
                <div>
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
                      <p className="text-gray-500 text-center text-sm">{gscError}</p>
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
                      <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-gray-500 px-1">
                        <div className="text-center">Last yr: {formatNumber(gscData.lastYear.clicks)}</div>
                        <div className="text-center">Last yr: {formatNumber(gscData.lastYear.impressions)}</div>
                        <div className="text-center">Last yr: {formatPercent(gscData.lastYear.ctr)}</div>
                        <div className="text-center">Last yr: {formatPosition(gscData.lastYear.position)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-center text-sm">No Search Console data available.</p>
                    </div>
                  )}
                </div>

                {/* Site Analytics (Google Analytics 4) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Site Analytics
                    <span className="text-xs font-normal text-gray-400 ml-2">(Last 28 days)</span>
                  </h3>
                  {isLoadingGa4 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Loader2 size={24} className="animate-spin text-ls-green mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Loading Analytics data...</p>
                    </div>
                  ) : ga4Error ? (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-center text-sm">{ga4Error}</p>
                      <button
                        onClick={() => fetchGa4Data(selectedStudy)}
                        className="mt-2 mx-auto block text-ls-green hover:text-ls-green-light text-sm font-medium"
                      >
                        Try again
                      </button>
                    </div>
                  ) : ga4Data ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-indigo-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-indigo-600 mb-1">
                          <Eye size={16} />
                        </div>
                        <p className="text-2xl font-bold text-indigo-600">{formatNumber(ga4Data.pageViews)}</p>
                        <p className="text-xs text-gray-600">Page Views</p>
                      </div>
                      <div className="bg-teal-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-teal-600 mb-1">
                          <Activity size={16} />
                        </div>
                        <p className="text-2xl font-bold text-teal-600">{formatNumber(ga4Data.engagedSessions)}</p>
                        <p className="text-xs text-gray-600">Engaged Sessions</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                          <Timer size={16} />
                        </div>
                        <p className="text-2xl font-bold text-amber-600">{formatEngagementTime(ga4Data.avgEngagementTime)}</p>
                        <p className="text-xs text-gray-600">Avg Time on Page</p>
                      </div>
                      <div className="bg-rose-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-rose-600 mb-1">
                          <ArrowDown size={16} />
                        </div>
                        <p className="text-2xl font-bold text-rose-600">
                          {ga4Data.scrollDepth > 0 ? `${ga4Data.scrollDepth.toFixed(0)}%` : '-'}
                        </p>
                        <p className="text-xs text-gray-600">Scroll Depth</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-center text-sm">No Analytics data available.</p>
                    </div>
                  )}
                </div>

                {/* Reader Insights */}
                {ga4Insights && (ga4Insights.topCities?.length > 0 || ga4Insights.trafficSources?.length > 0) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                      Reader Insights
                      <span className="text-xs font-normal text-gray-400 ml-2">(Last 28 days)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ga4Insights.topCities?.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <MapPin size={16} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Top Cities</span>
                          </div>
                          <div className="space-y-2">
                            {ga4Insights.topCities.map((city, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{city.city}</span>
                                <span className="font-medium text-gray-900">{formatNumber(city.users)} users</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ga4Insights.trafficSources?.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Share2 size={16} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Traffic Sources</span>
                          </div>
                          <div className="space-y-2">
                            {ga4Insights.trafficSources.map((source, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{source.source}</span>
                                <span className="font-medium text-gray-900">{formatNumber(source.sessions)} sessions</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== PITCH & OUTREACH TAB ===== */}
            {activeDetailTab === 'pitch' && (
              <div className="space-y-6">
                {/* Pitch Date */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Pitch Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={16} className="text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">Date Pitched</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedStudy.datePitched ? formatDate(selectedStudy.datePitched) : 'Not pitched'}
                      </p>
                    </div>
                    {selectedStudy.inContentCalendar && selectedStudy.calendarEntry?.status && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Target size={16} className="text-ls-green" />
                          <span className="text-sm font-medium text-gray-700">Status</span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedStudy.calendarEntry.status}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* National Email Metrics */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    National Email Metrics
                  </h3>
                  {selectedStudy.nationalOpenRate || selectedStudy.nationalClickRate || selectedStudy.nationalSends ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <Mail size={16} />
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedStudy.nationalOpenRate || '-'}
                        </p>
                        <p className="text-xs text-gray-600">Open Rate</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <MousePointerClick size={16} />
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedStudy.nationalClickRate || '-'}
                        </p>
                        <p className="text-xs text-gray-600">Click Rate</p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-indigo-600 mb-1">
                          <Send size={16} />
                        </div>
                        <p className="text-2xl font-bold text-indigo-600">
                          {selectedStudy.nationalSends || '-'}
                        </p>
                        <p className="text-xs text-gray-600">Total Sends</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-center text-sm">No national email metrics available.</p>
                    </div>
                  )}
                </div>

                {/* Local Email Metrics */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Local Email Metrics
                  </h3>
                  {selectedStudy.localAvgOpenRate || selectedStudy.localAvgClickRate || selectedStudy.localSends ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-teal-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-teal-600 mb-1">
                          <Mail size={16} />
                        </div>
                        <p className="text-2xl font-bold text-teal-600">
                          {selectedStudy.localAvgOpenRate || '-'}
                        </p>
                        <p className="text-xs text-gray-600">Avg Open Rate</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                          <MousePointerClick size={16} />
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">
                          {selectedStudy.localAvgClickRate || '-'}
                        </p>
                        <p className="text-xs text-gray-600">Avg Click Rate</p>
                      </div>
                      <div className="bg-cyan-50 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-cyan-600 mb-1">
                          <Send size={16} />
                        </div>
                        <p className="text-2xl font-bold text-cyan-600">
                          {selectedStudy.localSends || '-'}
                        </p>
                        <p className="text-xs text-gray-600">Total Sends</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-center text-sm">No local email metrics available.</p>
                    </div>
                  )}
                </div>

                {/* Expert Outreach */}
                {(selectedStudy.expertsContacted || selectedStudy.expertResponses) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                      Expert Outreach
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedStudy.expertsContacted && (
                        <div className="bg-amber-50 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                            <Users size={16} />
                          </div>
                          <p className="text-2xl font-bold text-amber-600">
                            {selectedStudy.expertsContacted}
                          </p>
                          <p className="text-xs text-gray-600">Experts Contacted</p>
                        </div>
                      )}
                      {selectedStudy.expertResponses && (
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                            <Mail size={16} />
                          </div>
                          <p className="text-2xl font-bold text-orange-600">
                            {selectedStudy.expertResponses}
                          </p>
                          <p className="text-xs text-gray-600">Expert Responses</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Calendar Status */}
                {selectedStudy.inContentCalendar && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                      Content Calendar
                    </h3>
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
                  </div>
                )}
              </div>
            )}

            {/* ===== LINKS TAB ===== */}
            {activeDetailTab === 'links' && (
              <div className="space-y-6">
                {/* Total Links */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Total Links</h3>
                  <div className="bg-ls-green-lighter rounded-lg p-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-ls-green mb-2">
                      <Link2 size={24} />
                    </div>
                    <p className="text-4xl font-bold text-ls-green">
                      {totalLinksFromYears || '-'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Total Links Earned</p>
                  </div>
                </div>

                {/* Links by Year */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Links by Year</h3>
                  {linksByYear.some(l => l.count > 0) ? (
                    <div className="space-y-3">
                      {linksByYear.map(({ year, count }) => (
                        <div key={year} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 w-12">{year}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-ls-green h-full rounded-full flex items-center justify-end pr-2 transition-all"
                              style={{ width: count > 0 ? `${Math.max((count / maxYearLinks) * 100, 8)}%` : '0%' }}
                            >
                              {count > 0 && (
                                <span className="text-xs font-semibold text-white">{count}</span>
                              )}
                            </div>
                          </div>
                          {count === 0 && (
                            <span className="text-sm text-gray-400">0</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-500 text-center text-sm">No yearly link breakdown available.</p>
                    </div>
                  )}
                </div>

                {/* Link Type Breakdown */}
                {(selectedStudy.doFollowLinks || selectedStudy.noFollowLinks) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Link Types</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedStudy.doFollowLinks && (
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">{selectedStudy.doFollowLinks}</p>
                          <p className="text-xs text-gray-600">DoFollow</p>
                        </div>
                      )}
                      {selectedStudy.noFollowLinks && (
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-gray-600">{selectedStudy.noFollowLinks}</p>
                          <p className="text-xs text-gray-600">NoFollow</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedStudy.hasSheetData && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-500 text-center">
                      No link data available for this study.
                      <br />
                      <span className="text-sm">Add this URL to the Study Story Data sheet to track links.</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ===== RELATED & NOTES TAB ===== */}
            {activeDetailTab === 'related' && (
              <div className="space-y-6">
                {/* Sheet Notes */}
                {selectedStudy.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Sheet Notes</h3>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                      {selectedStudy.notes}
                    </p>
                  </div>
                )}

                {/* Editable Comments */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Notes & Comments
                  </h3>
                  <textarea
                    value={archiveComments[commentKey] || ''}
                    onChange={(e) => updateArchiveComment(commentKey, e.target.value)}
                    placeholder="Add notes or comments about this story..."
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-ls-green focus:ring-1 focus:ring-ls-green resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Comments are saved automatically to your browser.</p>
                </div>

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
                          onClick={() => { setSelectedStudy(study); setActiveDetailTab('overview'); }}
                          className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {study.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(study.publishDate)}
                            {study.studyLinkNumber && ` \u2022 ${study.studyLinkNumber} links`}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-between gap-3 flex-shrink-0">
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
              ? 'bg-ls-green-lighter border-ls-green/30'
              : brandStatus.lawnlove.status === BRAND_STATUS.SUCCESS
              ? 'bg-ls-green-lighter border-ls-green/50'
              : brandStatus.lawnlove.status === BRAND_STATUS.ERROR
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              {brandStatus.lawnlove.status === BRAND_STATUS.LOADING && (
                <Loader2 size={16} className="animate-spin text-ls-green-dark" />
              )}
              {brandStatus.lawnlove.status === BRAND_STATUS.SUCCESS && (
                <div className="w-4 h-4 bg-ls-green-dark rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">&#10003;</span>
                </div>
              )}
              {brandStatus.lawnlove.status === BRAND_STATUS.ERROR && (
                <AlertCircle size={16} className="text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                brandStatus.lawnlove.status === BRAND_STATUS.ERROR ? 'text-red-700' : 'text-ls-green-dark'
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

          {/* Pitched Filter */}
          <div className="relative">
            <select
              value={pitchedFilter}
              onChange={(e) => setPitchedFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Pitch Status</option>
              <option value="Pitched">Pitched</option>
              <option value="Not Pitched">Not Pitched</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Metrics Filter */}
          <div className="relative">
            <select
              value={metricsFilter}
              onChange={(e) => setMetricsFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ls-green focus:border-transparent"
            >
              <option value="All">All Metrics</option>
              <option value="Has Metrics">Has Metrics</option>
              <option value="No Metrics">No Metrics</option>
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
              <option value="impressions">Most Impressions</option>
              <option value="position">Best Avg Position</option>
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
            <span className="px-2 py-0.5 bg-ls-green-lighter text-ls-green-dark rounded text-xs">
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
              setPitchedFilter('All');
              setMetricsFilter('All');
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
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-1">
                    <Eye size={14} /> Impressions
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  <span className="flex items-center gap-1">
                    <Globe size={14} /> Avg Pos
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
