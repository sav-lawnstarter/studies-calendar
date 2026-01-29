import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, LogIn, LogOut, ExternalLink, AlertCircle, TrendingUp, Link2, X, MousePointerClick, Eye, Target, BarChart3, Clock, ArrowDownToLine, Users, Settings, ChevronDown, ChevronUp, FileText, Download, MessageSquare, Award } from 'lucide-react';
import {
  loadGoogleScript,
  getStoredToken,
  authenticateWithGoogle,
  fetchSheetData,
  clearGoogleAuth,
} from '../utils/googleSheets';
import {
  fetchSearchConsoleWithComparison,
  fetchGA4MetricsForUrl,
  getPropertiesForBrand,
  getConfiguredBrands,
  formatEngagementTime,
  formatNumber,
  formatPercent,
  formatPosition,
  getChangeClass,
  getChangeArrow,
} from '../utils/googleAnalytics';

// Local storage key for comments
const COMMENTS_STORAGE_KEY = 'story-pitch-comments';

export default function StoryPitchAnalysis() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedStory, setSelectedStory] = useState(null);

  // Analytics state - now uses brand-based property configuration
  const [showAnalyticsConfig, setShowAnalyticsConfig] = useState(false);
  const configuredBrands = getConfiguredBrands();

  // Per-story analytics metrics
  const [storyMetrics, setStoryMetrics] = useState(null);
  const [isLoadingStoryMetrics, setIsLoadingStoryMetrics] = useState(false);
  const [storyMetricsError, setStoryMetricsError] = useState(null);

  // Cache for metrics displayed in the table (persists after viewing stories)
  const [metricsCache, setMetricsCache] = useState(() => {
    try {
      const stored = localStorage.getItem('story-metrics-cache');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Comments state
  const [comments, setComments] = useState(() => {
    try {
      const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Save comments to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  }, [comments]);

  // Save metrics cache to localStorage
  useEffect(() => {
    localStorage.setItem('story-metrics-cache', JSON.stringify(metricsCache));
  }, [metricsCache]);

  // Update comment for a story
  const updateComment = useCallback((storyId, comment) => {
    setComments(prev => ({
      ...prev,
      [storyId]: comment,
    }));
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setIsAuthenticated(true);
      fetchData(token);
    }
  }, []);

  // Fetch data from Google Sheets
  const fetchData = useCallback(async (token) => {
    setIsLoading(true);
    setError(null);

    try {
      const sheetData = await fetchSheetData(token);
      setData(sheetData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
      if (err.message.includes('Token expired') || err.message.includes('401')) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle Google authentication
  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      await loadGoogleScript();
      const token = await authenticateWithGoogle(clientId);
      setIsAuthenticated(true);
      await fetchData(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    const token = getStoredToken();
    if (token) {
      await fetchData(token);
    } else {
      setIsAuthenticated(false);
      setError('Session expired. Please re-authenticate.');
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearGoogleAuth();
    setIsAuthenticated(false);
    setData([]);
    setLastRefresh(null);
  };

  // Fetch metrics for selected story using brand-based property selection
  const fetchStoryMetrics = useCallback(async (story) => {
    if (!story?.study_url) {
      setStoryMetrics(null);
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    // Get properties based on brand
    const { gscProperty, ga4Property } = getPropertiesForBrand(story.brand);

    setIsLoadingStoryMetrics(true);
    setStoryMetricsError(null);

    try {
      const results = { gsc: null, ga4: null, brand: story.brand, gscProperty, ga4Property };

      // Fetch Search Console metrics
      if (gscProperty) {
        try {
          results.gsc = await fetchSearchConsoleWithComparison(token, gscProperty, story.study_url);
        } catch (err) {
          console.error('GSC fetch error:', err);
        }
      }

      // Fetch GA4 metrics
      if (ga4Property) {
        try {
          results.ga4 = await fetchGA4MetricsForUrl(token, ga4Property, story.study_url);
        } catch (err) {
          console.error('GA4 fetch error:', err);
        }
      }

      setStoryMetrics(results);
    } catch (err) {
      setStoryMetricsError(err.message);
    } finally {
      setIsLoadingStoryMetrics(false);
    }
  }, []);

  // Fetch metrics when story is selected and cache them
  useEffect(() => {
    if (selectedStory) {
      fetchStoryMetrics(selectedStory);
    } else {
      setStoryMetrics(null);
      setStoryMetricsError(null);
    }
  }, [selectedStory, fetchStoryMetrics]);

  // Cache metrics when they're loaded
  useEffect(() => {
    if (selectedStory && storyMetrics?.gsc) {
      setMetricsCache(prev => ({
        ...prev,
        [selectedStory.id]: {
          avgPosition: storyMetrics.gsc.current.position,
          impressionsChange: storyMetrics.gsc.comparison.impressionsChange,
          lastUpdated: new Date().toISOString(),
        },
      }));
    }
  }, [selectedStory, storyMetrics]);

  // Calculate metrics from data
  const calculateMetrics = useCallback(() => {
    if (!data.length) return { totalStories: 0, totalLinks: 0 };

    // Sum links using Study Link # column
    let totalLinks = 0;

    data.forEach(item => {
      // Use Study Link # column for link count
      totalLinks += parseFloat(item['study_link_'] || 0);
    });

    return {
      totalStories: data.length,
      totalLinks,
      // DA metrics will be added when external service is connected
      avgDA: null,
      linksAbove50: null,
      linksAbove80: null,
    };
  }, [data]);

  const metrics = calculateMetrics();

  // Calculate performance score and rank for each story
  const rankedData = useMemo(() => {
    if (!data.length) return [];

    // Calculate performance score for each story
    // Score based on link count (DA will be added when external service is connected)
    const storiesWithScores = data.map(item => {
      // Parse year-based link counts for display
      const links2025 = parseFloat(item['2025_link_'] || 0);
      const links2024 = parseFloat(item['2024_link_'] || 0);
      const links2023 = parseFloat(item['2023_link_'] || 0);
      const links2022 = parseFloat(item['2022_link_'] || 0);
      const links2021 = parseFloat(item['2021_link_'] || 0);

      // Use Study Link # column for total link count
      const linkCount = parseFloat(item['study_link_'] || 0);

      // Performance score: based on link count only (DA from external service not yet connected)
      const performanceScore = linkCount;

      return {
        ...item,
        links2025,
        links2024,
        links2023,
        links2022,
        links2021,
        linkCount,
        avgDA: null, // Will be populated when external DA service is connected
        performanceScore,
        hasHighLinks: linkCount >= 80,
      };
    });

    // Sort by performance score and assign ranks
    const sorted = [...storiesWithScores].sort((a, b) => b.performanceScore - a.performanceScore);
    sorted.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Create a map of id to rank
    const rankMap = new Map(sorted.map(item => [item.id, item.rank]));

    // Return data with ranks in original order
    return storiesWithScores.map(item => ({
      ...item,
      rank: rankMap.get(item.id),
    }));
  }, [data]);

  // Get row color based on performance
  const getRowColor = useCallback((story) => {
    const totalStories = rankedData.length;
    if (totalStories === 0) return '';

    const topThird = Math.ceil(totalStories / 3);
    const bottomThird = totalStories - Math.ceil(totalStories / 3);

    if (story.rank <= topThird) {
      return 'bg-green-50 hover:bg-green-100'; // Green = performing well
    } else if (story.rank > bottomThird) {
      return 'bg-red-50 hover:bg-red-100'; // Red = underperforming
    } else {
      return 'bg-yellow-50 hover:bg-yellow-100'; // Yellow = middle
    }
  }, [rankedData]);

  // Get visual indicators for a story
  const getVisualIndicators = useCallback((story) => {
    let indicators = '';
    if (story.hasHighLinks) {
      indicators += '🔥 '; // 80+ links
    }
    return indicators;
  }, []);

  // Generate report content
  const generateReport = useCallback(() => {
    const sortedByPerformance = [...rankedData].sort((a, b) => b.performanceScore - a.performanceScore);
    const bestPerformers = sortedByPerformance.slice(0, 5);
    const worstPerformers = sortedByPerformance.slice(-5).reverse();

    const totalLinks = rankedData.reduce((sum, item) => sum + item.linkCount, 0);
    const avgLinksPerStory = rankedData.length > 0 ? (totalLinks / rankedData.length).toFixed(1) : 0;

    return {
      title: 'Story & Pitch Analysis Report',
      generatedAt: new Date().toLocaleString(),
      summary: {
        totalStories: rankedData.length,
        totalLinks,
        avgLinksPerStory,
        storiesWithHighLinks: rankedData.filter(s => s.hasHighLinks).length,
      },
      bestPerformers,
      worstPerformers,
      allStories: sortedByPerformance,
    };
  }, [rankedData]);

  // Export report as PDF (using browser print)
  const exportReportAsPDF = useCallback(() => {
    const report = generateReport();

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #0AB463; border-bottom: 2px solid #0AB463; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
          .summary-card { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #0AB463; }
          .summary-card .label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .rank { font-weight: bold; }
          .best { color: #16a34a; }
          .worst { color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${report.title}</h1>
        <p>Generated: ${report.generatedAt}</p>

        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="value">${report.summary.totalStories}</div>
            <div class="label">Total Stories Pitched</div>
          </div>
          <div class="summary-card">
            <div class="value">${report.summary.totalLinks}</div>
            <div class="label">Total Links</div>
          </div>
          <div class="summary-card">
            <div class="value">${report.summary.avgLinksPerStory}</div>
            <div class="label">Avg Links per Story</div>
          </div>
          <div class="summary-card">
            <div class="value">${report.summary.storiesWithHighLinks}</div>
            <div class="label">Stories with 80+ Links</div>
          </div>
        </div>

        <h2 class="best">Best Performers</h2>
        <table>
          <thead>
            <tr><th>Rank</th><th>Story Title</th><th>Brand</th><th>Links</th><th>Score</th></tr>
          </thead>
          <tbody>
            ${report.bestPerformers.map(s => `
              <tr>
                <td class="rank">#${s.rank}</td>
                <td>${s.study_title || '-'}</td>
                <td>${s.brand || '-'}</td>
                <td>${s.linkCount}</td>
                <td>${s.performanceScore.toFixed(1)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2 class="worst">Needs Improvement</h2>
        <table>
          <thead>
            <tr><th>Rank</th><th>Story Title</th><th>Brand</th><th>Links</th><th>Score</th></tr>
          </thead>
          <tbody>
            ${report.worstPerformers.map(s => `
              <tr>
                <td class="rank">#${s.rank}</td>
                <td>${s.study_title || '-'}</td>
                <td>${s.brand || '-'}</td>
                <td>${s.linkCount}</td>
                <td>${s.performanceScore.toFixed(1)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>All Stories by Performance</h2>
        <table>
          <thead>
            <tr><th>Rank</th><th>Story Title</th><th>Brand</th><th>Links</th><th>Score</th></tr>
          </thead>
          <tbody>
            ${report.allStories.map(s => `
              <tr>
                <td class="rank">#${s.rank}</td>
                <td>${s.study_title || '-'}</td>
                <td>${s.brand || '-'}</td>
                <td>${s.linkCount}</td>
                <td>${s.performanceScore.toFixed(1)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Report generated from Studies Calendar - Story & Pitch Analysis
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [generateReport]);

  // Export as CSV
  const exportReportAsCSV = useCallback(() => {
    const report = generateReport();

    const headers = ['Rank', 'Story Title', 'Brand', 'Links', 'Performance Score', 'Date Pitched', 'Comment'];
    const rows = report.allStories.map(s => [
      s.rank,
      `"${(s.study_title || '').replace(/"/g, '""')}"`,
      s.brand || '',
      s.linkCount,
      s.performanceScore.toFixed(1),
      s.date_pitched || '',
      `"${(comments[s.id] || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `story-pitch-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [generateReport, comments]);

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="bg-white border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Story & Pitch Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">Connect to Google Sheets to view study data</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-ls-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn size={32} className="text-ls-green" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connect Your Google Account
            </h3>
            <p className="text-gray-600 mb-6">
              Authenticate with Google to access the Study Story Data spreadsheet and view analytics.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 text-left">{error}</p>
              </div>
            )}

            {!clientId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 text-left">
                  Google Client ID not configured. Set the VITE_GOOGLE_CLIENT_ID environment variable.
                </p>
              </div>
            )}

            <button
              onClick={handleAuthenticate}
              disabled={isAuthenticating || !clientId}
              className="inline-flex items-center gap-2 px-6 py-3 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Sign in with Google
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated view with data
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Story & Pitch Analysis</h2>
            {lastRefresh && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReportModal(true)}
              disabled={rankedData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={18} />
              Generate Report
            </button>
            <button
              onClick={() => setShowAnalyticsConfig(!showAnalyticsConfig)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showAnalyticsConfig ? 'bg-ls-green text-white border-ls-green' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Settings size={18} />
              Analytics Config
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh Data
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Configuration Panel */}
      {showAnalyticsConfig && (
        <div className="px-6 py-4 bg-blue-50 border-b">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Connected Analytics Properties by Brand</h3>
          <div className="grid grid-cols-3 gap-4">
            {configuredBrands.map((brand) => (
              <div key={brand.brand} className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-900 mb-3">{brand.brand}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${brand.gscConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-gray-600">Search Console:</span>
                    {brand.gscConnected ? (
                      <span className="text-gray-900 truncate flex-1" title={brand.gscProperty}>
                        {brand.gscProperty.replace('https://', '').replace('http://', '').replace('sc-domain:', '')}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not configured</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${brand.ga4Connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-gray-600">GA4 Property:</span>
                    {brand.ga4Connected ? (
                      <span className="text-gray-900">{brand.ga4Property}</span>
                    ) : (
                      <span className="text-gray-400 italic">Not configured</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-600">
            Properties are configured via environment variables (VITE_[BRAND]_GSC_PROPERTY and VITE_[BRAND]_GA4_PROPERTY).
            When viewing study details, metrics are automatically fetched from the correct property based on the study's brand.
          </p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ls-green/10 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-ls-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalStories}</p>
                <p className="text-sm text-gray-500">Total Stories</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ls-blue/10 rounded-lg flex items-center justify-center">
                <Link2 size={20} className="text-ls-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalLinks}</p>
                <p className="text-sm text-gray-500">Total Links</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ls-orange/10 rounded-lg flex items-center justify-center">
                <Link2 size={20} className="text-ls-orange" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.avgDA ?? '-'}</p>
                <p className="text-sm text-gray-500">Avg Domain Authority</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Link2 size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.linksAbove80 ?? '-'}</p>
                <p className="text-sm text-gray-500">Links DA &gt; 80</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Performance Legend */}
      {rankedData.length > 0 && (
        <div className="px-6 py-3 bg-white border-b flex items-center gap-6 text-sm">
          <span className="font-medium text-gray-700">Legend:</span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-green-50 border border-green-200 rounded"></span>
            Top performing
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></span>
            Middle performing
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-red-50 border border-red-200 rounded"></span>
            Needs improvement
          </span>
          <span className="flex items-center gap-2">
            🔥 80+ links
          </span>
        </div>
      )}

      {/* Data Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && rankedData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-ls-green" />
          </div>
        ) : rankedData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No data available. Click "Refresh Data" to load.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b w-16">Rank</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Brand</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Study Title</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b w-20">URL</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">2025<br/>Link #</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">2024<br/>Link #</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">2023<br/>Link #</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">2022<br/>Link #</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">2021<br/>Link #</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">Avg DA</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">National O/R</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">National C/R</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b">Date Pitched</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b" title="Click story to load">Avg Position</th>
                  <th className="text-center px-3 py-3 text-sm font-semibold text-gray-700 border-b" title="Click story to load">Impr. % YoY</th>
                </tr>
              </thead>
              <tbody>
                {rankedData.map((row) => (
                  <tr
                    key={row.id}
                    className={`${getRowColor(row)} transition-colors`}
                  >
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full font-semibold">
                        #{row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      {row.brand || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm border-b max-w-xs">
                      <button
                        onClick={() => setSelectedStory(row)}
                        className="text-ls-green hover:underline text-left truncate block w-full"
                        title={row.study_title}
                      >
                        {getVisualIndicators(row)}{row.study_title || '-'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm border-b">
                      {row.study_url ? (
                        <a
                          href={row.study_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ls-green hover:underline inline-flex items-center gap-1"
                        >
                          View <ExternalLink size={14} />
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center font-medium">
                      {row.links2025 || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center font-medium">
                      {row.links2024 || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center font-medium">
                      {row.links2023 || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center font-medium">
                      {row.links2022 || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center font-medium">
                      {row.links2021 || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center">
                      {row.avgDA || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center">
                      {row.national_o_r || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center">
                      {row.national_c_r || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center">
                      {row.date_pitched || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 border-b text-center">
                      {metricsCache[row.id]?.avgPosition !== undefined
                        ? formatPosition(metricsCache[row.id].avgPosition)
                        : <span className="text-gray-400 text-xs">Click to load</span>}
                    </td>
                    <td className="px-3 py-3 text-sm border-b text-center">
                      {metricsCache[row.id]?.impressionsChange !== null && metricsCache[row.id]?.impressionsChange !== undefined ? (
                        <span className={getChangeClass(metricsCache[row.id].impressionsChange)}>
                          {getChangeArrow(metricsCache[row.id].impressionsChange)}{metricsCache[row.id].impressionsChange}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Click to load</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedStory(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Study Details</h3>
              <button onClick={() => setSelectedStory(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Brand</label>
                  <p className="text-gray-900">{selectedStory.brand || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Date Pitched</label>
                  <p className="text-gray-900">{selectedStory.date_pitched || '-'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Study Title</label>
                <p className="text-gray-900 font-medium">{selectedStory.study_title || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Study URL</label>
                {selectedStory.study_url ? (
                  <a
                    href={selectedStory.study_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ls-green hover:underline inline-flex items-center gap-1"
                  >
                    {selectedStory.study_url} <ExternalLink size={14} />
                  </a>
                ) : <p className="text-gray-900">-</p>}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Links by Year</h4>
                <div className="grid grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">2025</label>
                    <p className="text-gray-900 font-medium">{selectedStory.links2025 || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">2024</label>
                    <p className="text-gray-900 font-medium">{selectedStory.links2024 || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">2023</label>
                    <p className="text-gray-900 font-medium">{selectedStory.links2023 || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">2022</label>
                    <p className="text-gray-900 font-medium">{selectedStory.links2022 || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">2021</label>
                    <p className="text-gray-900 font-medium">{selectedStory.links2021 || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Total</label>
                    <p className="text-gray-900 font-bold">{selectedStory.linkCount || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">National Metrics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">National O/R</label>
                    <p className="text-gray-900">{selectedStory.national_o_r || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">National C/R</label>
                    <p className="text-gray-900">{selectedStory.national_c_r || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">National Sends</label>
                    <p className="text-gray-900">{selectedStory.national_sends || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Local Metrics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Avg O/R Local</label>
                    <p className="text-gray-900">{selectedStory.average_o_r_local || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Avg C/R Local</label>
                    <p className="text-gray-900">{selectedStory.average_c_r_local || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Local Sends</label>
                    <p className="text-gray-900">{selectedStory.local_sends || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Search Console Metrics */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-ls-blue" />
                  Search Console Metrics (Last 28 Days)
                  {storyMetrics?.gscProperty && (
                    <span className="text-xs text-gray-400 font-normal">
                      via {storyMetrics.gscProperty.replace('https://', '').replace('http://', '').replace('sc-domain:', '')}
                    </span>
                  )}
                </h4>
                {isLoadingStoryMetrics ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <RefreshCw size={16} className="animate-spin" />
                    Loading metrics...
                  </div>
                ) : !storyMetrics?.gscProperty ? (
                  <p className="text-sm text-gray-500 py-2">No Search Console property configured for brand "{selectedStory.brand}". Set VITE_{selectedStory.brand?.toUpperCase().replace(/\s/g, '')}_GSC_PROPERTY.</p>
                ) : storyMetrics?.gsc ? (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MousePointerClick size={14} className="text-ls-green" />
                          <label className="text-xs font-medium text-gray-500">Total Clicks</label>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{formatNumber(storyMetrics.gsc.current.clicks)}</p>
                        {storyMetrics.gsc.comparison.clicksChange !== null && (
                          <p className={`text-xs ${getChangeClass(storyMetrics.gsc.comparison.clicksChange)}`}>
                            {getChangeArrow(storyMetrics.gsc.comparison.clicksChange)}{storyMetrics.gsc.comparison.clicksChange}% vs last year
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye size={14} className="text-ls-blue" />
                          <label className="text-xs font-medium text-gray-500">Total Impressions</label>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{formatNumber(storyMetrics.gsc.current.impressions)}</p>
                        {storyMetrics.gsc.comparison.impressionsChange !== null && (
                          <p className={`text-xs ${getChangeClass(storyMetrics.gsc.comparison.impressionsChange)}`}>
                            {getChangeArrow(storyMetrics.gsc.comparison.impressionsChange)}{storyMetrics.gsc.comparison.impressionsChange}% vs last year
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Target size={14} className="text-ls-orange" />
                          <label className="text-xs font-medium text-gray-500">Avg CTR</label>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{formatPercent(storyMetrics.gsc.current.ctr)}</p>
                        {storyMetrics.gsc.comparison.ctrChange !== null && (
                          <p className={`text-xs ${getChangeClass(storyMetrics.gsc.comparison.ctrChange)}`}>
                            {getChangeArrow(storyMetrics.gsc.comparison.ctrChange)}{storyMetrics.gsc.comparison.ctrChange}% vs last year
                          </p>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp size={14} className="text-purple-600" />
                          <label className="text-xs font-medium text-gray-500">Avg Position</label>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{formatPosition(storyMetrics.gsc.current.position)}</p>
                        {storyMetrics.gsc.comparison.positionChange !== null && (
                          <p className={`text-xs ${getChangeClass(storyMetrics.gsc.comparison.positionChange, false)}`}>
                            {parseFloat(storyMetrics.gsc.comparison.positionChange) > 0 ? '+' : ''}{storyMetrics.gsc.comparison.positionChange} positions vs last year
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-4 text-xs text-gray-500">
                      <div>Last Year: {formatNumber(storyMetrics.gsc.lastYear.clicks)}</div>
                      <div>Last Year: {formatNumber(storyMetrics.gsc.lastYear.impressions)}</div>
                      <div>Last Year: {formatPercent(storyMetrics.gsc.lastYear.ctr)}</div>
                      <div>Last Year: {formatPosition(storyMetrics.gsc.lastYear.position)}</div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 py-2">No Search Console data available for this URL.</p>
                )}
              </div>

              {/* Google Analytics Metrics */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users size={16} className="text-ls-orange" />
                  Analytics Metrics (Last 28 Days)
                  {storyMetrics?.ga4Property && (
                    <span className="text-xs text-gray-400 font-normal">
                      Property ID: {storyMetrics.ga4Property}
                    </span>
                  )}
                </h4>
                {isLoadingStoryMetrics ? (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <RefreshCw size={16} className="animate-spin" />
                    Loading metrics...
                  </div>
                ) : !storyMetrics?.ga4Property ? (
                  <p className="text-sm text-gray-500 py-2">No GA4 property configured for brand "{selectedStory.brand}". Set VITE_{selectedStory.brand?.toUpperCase().replace(/\s/g, '')}_GA4_PROPERTY.</p>
                ) : storyMetrics?.ga4 ? (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowDownToLine size={14} className="text-ls-green" />
                        <label className="text-xs font-medium text-gray-500">Entrances</label>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{formatNumber(storyMetrics.ga4.entrances)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-ls-blue" />
                        <label className="text-xs font-medium text-gray-500">Engaged Sessions</label>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{formatNumber(storyMetrics.ga4.engagedSessions)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-ls-orange" />
                        <label className="text-xs font-medium text-gray-500">Avg. Engagement Time</label>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{formatEngagementTime(storyMetrics.ga4.avgEngagementTime)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <ChevronDown size={14} className="text-purple-600" />
                        <label className="text-xs font-medium text-gray-500">Scroll Depth</label>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">{storyMetrics.ga4.scrollDepth.toFixed(1)}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">No Analytics data available for this URL.</p>
                )}
              </div>

              {/* Comments Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} className="text-ls-green" />
                  Notes & Comments
                </h4>
                <textarea
                  value={comments[selectedStory.id] || ''}
                  onChange={(e) => updateComment(selectedStory.id, e.target.value)}
                  placeholder="Add notes or comments about this story..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-ls-green focus:ring-1 focus:ring-ls-green resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Comments are saved automatically to your browser.</p>
              </div>

              {storyMetricsError && (
                <div className="border-t pt-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{storyMetricsError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-purple-600" />
                Generate Performance Report
              </h3>
              <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Generate a comprehensive performance report including all stories pitched, total links,
                best and worst performers, and detailed rankings.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    exportReportAsPDF();
                    setShowReportModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download size={20} />
                  Export as PDF
                  <span className="text-purple-200 text-sm">(Print to PDF)</span>
                </button>

                <button
                  onClick={() => {
                    exportReportAsCSV();
                    setShowReportModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText size={20} />
                  Export as CSV
                  <span className="text-gray-400 text-sm">(Spreadsheet)</span>
                </button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Report includes:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Total stories pitched: {rankedData.length}</li>
                  <li>• Total links: {rankedData.reduce((sum, item) => sum + item.linkCount, 0)}</li>
                  <li>• Stories with 80+ links: {rankedData.filter(s => s.hasHighLinks).length}</li>
                  <li>• Best and worst performers</li>
                  <li>• Performance rankings for all stories</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
