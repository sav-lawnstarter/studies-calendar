import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LogIn, LogOut, ExternalLink, AlertCircle, TrendingUp, Link2, X, MousePointerClick, Eye, Target, BarChart3, Clock, ArrowDownToLine, Users, Settings, ChevronDown, ChevronUp } from 'lucide-react';
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

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

  // Fetch metrics when story is selected
  useEffect(() => {
    if (selectedStory) {
      fetchStoryMetrics(selectedStory);
    } else {
      setStoryMetrics(null);
      setStoryMetricsError(null);
    }
  }, [selectedStory, fetchStoryMetrics]);

  // Calculate metrics from data
  const calculateMetrics = useCallback(() => {
    if (!data.length) return { avgDA: 0, linksAbove50: 0, linksAbove80: 0 };

    // Parse link numbers and calculate DA metrics
    // Assuming link # represents some form of authority metric
    let totalLinks = 0;
    let linksAbove50 = 0;
    let linksAbove80 = 0;
    let linkSum = 0;

    data.forEach(item => {
      const linkNum = parseFloat(item.study_link_ || item.prev__link_ || 0);
      if (linkNum > 0) {
        totalLinks++;
        linkSum += linkNum;
        if (linkNum > 50) linksAbove50++;
        if (linkNum > 80) linksAbove80++;
      }
    });

    return {
      avgDA: totalLinks > 0 ? (linkSum / totalLinks).toFixed(1) : 0,
      linksAbove50,
      linksAbove80,
      totalStories: data.length,
    };
  }, [data]);

  const metrics = calculateMetrics();

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
                <p className="text-2xl font-bold text-gray-900">{metrics.avgDA}</p>
                <p className="text-sm text-gray-500">Avg Domain Authority</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ls-orange/10 rounded-lg flex items-center justify-center">
                <Link2 size={20} className="text-ls-orange" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.linksAbove50}</p>
                <p className="text-sm text-gray-500">Links DA &gt; 50</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Link2 size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.linksAbove80}</p>
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

      {/* Data Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="animate-spin text-ls-green" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No data available. Click "Refresh Data" to load.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Brand</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Study Title</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">Study URL</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Study Link #</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">National O/R</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">National C/R</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">National Sends</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Avg O/R Local</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Avg C/R Local</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Local Sends</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Prev. Link #</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Date Pitched</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-ls-green/5 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 border-b">
                      {row.brand || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm border-b max-w-xs">
                      <button
                        onClick={() => setSelectedStory(row)}
                        className="text-ls-green hover:underline text-left truncate block w-full"
                        title={row.study_title}
                      >
                        {row.study_title || '-'}
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
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.study_link_ || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.national_o_r || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.national_c_r || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.national_sends || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.average_o_r_local || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.average_c_r_local || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.local_sends || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.prev__link_ || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.date_pitched || '-'}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Study Link #</label>
                  <p className="text-gray-900">{selectedStory.study_link_ || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Prev. Link #</label>
                  <p className="text-gray-900">{selectedStory.prev__link_ || '-'}</p>
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
    </div>
  );
}
