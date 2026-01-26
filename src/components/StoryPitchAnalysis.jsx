import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LogIn, LogOut, ExternalLink, AlertCircle, TrendingUp, Link2 } from 'lucide-react';
import {
  loadGoogleScript,
  getStoredToken,
  authenticateWithGoogle,
  fetchSheetData,
  clearGoogleAuth,
} from '../utils/googleSheets';

export default function StoryPitchAnalysis() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);

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
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Link #</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Avg O/R</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Avg C/R</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 border-b">News Peg</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700 border-b">Prev. Link #</th>
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
                    <td className="px-4 py-3 text-sm text-gray-900 border-b max-w-xs truncate" title={row.study_title}>
                      {row.study_title || '-'}
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
                      {row.average_o_r || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.average_c_r || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b max-w-xs truncate" title={row.news_peg}>
                      {row.news_peg || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-b text-center">
                      {row.prev__link_ || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
