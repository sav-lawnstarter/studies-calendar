// Google Search Console and Analytics API utility

// Helper function to extract detailed error message from Google API error responses
const extractApiErrorMessage = async (response, fallbackPrefix) => {
  try {
    const errorData = await response.json();
    // Google APIs return error details in various formats
    if (errorData.error?.message) {
      return `${fallbackPrefix}: ${errorData.error.message}`;
    }
    if (errorData.error?.status) {
      return `${fallbackPrefix}: ${errorData.error.status}`;
    }
    if (errorData.message) {
      return `${fallbackPrefix}: ${errorData.message}`;
    }
    // Fallback to statusText if no message found in body
    return `${fallbackPrefix}: ${response.statusText || response.status}`;
  } catch {
    // If JSON parsing fails, use statusText
    return `${fallbackPrefix}: ${response.statusText || response.status}`;
  }
};

// Brand-specific property configuration from environment variables
export const BRAND_PROPERTIES = {
  'LawnStarter': {
    gscProperty: import.meta.env.VITE_LAWNSTARTER_GSC_PROPERTY || '',
    ga4Property: import.meta.env.VITE_LAWNSTARTER_GA4_PROPERTY || '',
  },
  'Lawn Love': {
    gscProperty: import.meta.env.VITE_LAWNLOVE_GSC_PROPERTY || '',
    ga4Property: import.meta.env.VITE_LAWNLOVE_GA4_PROPERTY || '',
  },
  'Home Gnome': {
    gscProperty: import.meta.env.VITE_HOMEGNOME_GSC_PROPERTY || '',
    ga4Property: import.meta.env.VITE_HOMEGNOME_GA4_PROPERTY || '',
  },
};

// Get properties for a specific brand
export const getPropertiesForBrand = (brand) => {
  if (!brand) return { gscProperty: '', ga4Property: '' };

  // Try exact match first
  if (BRAND_PROPERTIES[brand]) {
    return BRAND_PROPERTIES[brand];
  }

  // Try case-insensitive match
  const normalizedBrand = brand.toLowerCase().trim();
  for (const [key, value] of Object.entries(BRAND_PROPERTIES)) {
    if (key.toLowerCase() === normalizedBrand) {
      return value;
    }
  }

  // Try partial match (e.g., "lawnstarter" matches "LawnStarter")
  for (const [key, value] of Object.entries(BRAND_PROPERTIES)) {
    if (normalizedBrand.includes(key.toLowerCase().replace(/\s/g, '')) ||
        key.toLowerCase().replace(/\s/g, '').includes(normalizedBrand.replace(/\s/g, ''))) {
      return value;
    }
  }

  return { gscProperty: '', ga4Property: '' };
};

// Get all configured brands with their connection status
export const getConfiguredBrands = () => {
  return Object.entries(BRAND_PROPERTIES).map(([brand, props]) => ({
    brand,
    gscProperty: props.gscProperty,
    ga4Property: props.ga4Property,
    gscConnected: !!props.gscProperty,
    ga4Connected: !!props.ga4Property,
  }));
};

// Fetch Google Search Console metrics for a specific URL
export const fetchSearchConsoleMetrics = async (accessToken, siteUrl, pageUrl, startDate, endDate) => {
  // Format the site URL for the API (must be the property URL)
  const formattedSiteUrl = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${formattedSiteUrl}/searchAnalytics/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ['page'],
      dimensionFilterGroups: [{
        filters: [{
          dimension: 'page',
          operator: 'contains',
          expression: pageUrl
        }]
      }],
      rowLimit: 1
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token expired. Please re-authenticate.');
    }
    if (response.status === 403) {
      throw new Error('Access denied to Search Console. Ensure you have access to this property.');
    }
    const errorMessage = await extractApiErrorMessage(response, 'Failed to fetch Search Console data');
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (data.rows && data.rows.length > 0) {
    const row = data.rows[0];
    return {
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    };
  }

  return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
};

// Fetch Search Console metrics with year-over-year comparison
export const fetchSearchConsoleWithComparison = async (accessToken, siteUrl, pageUrl) => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  // Calculate start date (last 28 days for current period)
  const startDateCurrent = new Date(today);
  startDateCurrent.setDate(startDateCurrent.getDate() - 28);
  const startDateCurrentStr = startDateCurrent.toISOString().split('T')[0];

  // Last year same period
  const endDateLastYear = new Date(today);
  endDateLastYear.setFullYear(endDateLastYear.getFullYear() - 1);
  const endDateLastYearStr = endDateLastYear.toISOString().split('T')[0];

  const startDateLastYear = new Date(startDateCurrent);
  startDateLastYear.setFullYear(startDateLastYear.getFullYear() - 1);
  const startDateLastYearStr = startDateLastYear.toISOString().split('T')[0];

  try {
    const [currentMetrics, lastYearMetrics] = await Promise.all([
      fetchSearchConsoleMetrics(accessToken, siteUrl, pageUrl, startDateCurrentStr, endDate),
      fetchSearchConsoleMetrics(accessToken, siteUrl, pageUrl, startDateLastYearStr, endDateLastYearStr),
    ]);

    return {
      current: currentMetrics,
      lastYear: lastYearMetrics,
      comparison: {
        clicksChange: lastYearMetrics.clicks > 0
          ? ((currentMetrics.clicks - lastYearMetrics.clicks) / lastYearMetrics.clicks * 100).toFixed(1)
          : null,
        impressionsChange: lastYearMetrics.impressions > 0
          ? ((currentMetrics.impressions - lastYearMetrics.impressions) / lastYearMetrics.impressions * 100).toFixed(1)
          : null,
        ctrChange: lastYearMetrics.ctr > 0
          ? ((currentMetrics.ctr - lastYearMetrics.ctr) / lastYearMetrics.ctr * 100).toFixed(1)
          : null,
        positionChange: lastYearMetrics.position > 0
          ? (lastYearMetrics.position - currentMetrics.position).toFixed(1) // Lower is better
          : null,
      }
    };
  } catch (error) {
    console.error('Error fetching Search Console data:', error);
    throw error;
  }
};

// Fetch Google Analytics 4 metrics for a specific page
export const fetchGA4Metrics = async (accessToken, propertyId, pagePath, startDate, endDate) => {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'entrances' },
        { name: 'engagedSessions' },
        { name: 'averageSessionDuration' },
        { name: 'scrolledUsers' },
        { name: 'totalUsers' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'CONTAINS',
            value: pagePath
          }
        }
      },
      limit: 1
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token expired. Please re-authenticate.');
    }
    if (response.status === 403) {
      throw new Error('Access denied to Google Analytics. Ensure you have access to this property.');
    }
    const errorMessage = await extractApiErrorMessage(response, 'Failed to fetch Analytics data');
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (data.rows && data.rows.length > 0) {
    const metrics = data.rows[0].metricValues;
    const totalUsers = parseFloat(metrics[4]?.value) || 0;
    const scrolledUsers = parseFloat(metrics[3]?.value) || 0;

    return {
      entrances: parseInt(metrics[0]?.value) || 0,
      engagedSessions: parseInt(metrics[1]?.value) || 0,
      avgEngagementTime: parseFloat(metrics[2]?.value) || 0,
      scrollDepth: totalUsers > 0 ? (scrolledUsers / totalUsers * 100) : 0,
    };
  }

  return { entrances: 0, engagedSessions: 0, avgEngagementTime: 0, scrollDepth: 0 };
};

// Fetch GA4 metrics for a URL
export const fetchGA4MetricsForUrl = async (accessToken, propertyId, pageUrl) => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  // Last 28 days
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 28);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Extract path from URL
  let pagePath = pageUrl;
  try {
    const urlObj = new URL(pageUrl);
    pagePath = urlObj.pathname;
  } catch (e) {
    // If URL parsing fails, use as-is
  }

  return fetchGA4Metrics(accessToken, propertyId, pagePath, startDateStr, endDate);
};

// Extract domain from URL for Search Console site matching
export const extractDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/`;
  } catch (e) {
    return null;
  }
};

// Format engagement time (seconds to readable format)
export const formatEngagementTime = (seconds) => {
  if (!seconds || seconds === 0) return '0s';

  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

// Format large numbers with commas
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString();
};

// Format percentage
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
};

// Format position (average position from GSC)
export const formatPosition = (position) => {
  if (position === null || position === undefined || position === 0) return '-';
  return position.toFixed(1);
};

// Get change indicator class
export const getChangeClass = (change, higherIsBetter = true) => {
  if (change === null || change === undefined) return 'text-gray-500';
  const numChange = parseFloat(change);
  if (higherIsBetter) {
    return numChange > 0 ? 'text-green-600' : numChange < 0 ? 'text-red-600' : 'text-gray-500';
  }
  return numChange < 0 ? 'text-green-600' : numChange > 0 ? 'text-red-600' : 'text-gray-500';
};

// Get change arrow
export const getChangeArrow = (change) => {
  if (change === null || change === undefined) return '';
  const numChange = parseFloat(change);
  return numChange > 0 ? '+' : '';
};

// Batch fetch Search Console metrics for multiple URLs
// Returns a map of URL -> { impressions, position, clicks, ctr }
export const batchFetchSearchConsoleMetrics = async (accessToken, studies) => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  // Calculate start date (last 28 days)
  const startDateCurrent = new Date(today);
  startDateCurrent.setDate(startDateCurrent.getDate() - 28);
  const startDateCurrentStr = startDateCurrent.toISOString().split('T')[0];

  const results = {};

  // Group studies by brand/GSC property to minimize API calls
  const studiesByProperty = {};
  for (const study of studies) {
    const { gscProperty } = getPropertiesForBrand(study.brand);
    if (!gscProperty) continue;

    if (!studiesByProperty[gscProperty]) {
      studiesByProperty[gscProperty] = [];
    }
    studiesByProperty[gscProperty].push(study);
  }

  // Fetch metrics for each property
  for (const [siteUrl, propertyStudies] of Object.entries(studiesByProperty)) {
    try {
      const formattedSiteUrl = encodeURIComponent(siteUrl);
      const url = `https://www.googleapis.com/webmasters/v3/sites/${formattedSiteUrl}/searchAnalytics/query`;

      // Get all pages for this property (with pagination if needed)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDateCurrentStr,
          endDate,
          dimensions: ['page'],
          rowLimit: 5000,  // Get up to 5000 pages
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to fetch GSC data for ${siteUrl}:`, response.statusText);
        continue;
      }

      const data = await response.json();

      if (data.rows) {
        // Build a map of normalized URLs to metrics
        const urlMetrics = {};
        for (const row of data.rows) {
          const pageUrl = row.keys[0].toLowerCase();
          urlMetrics[pageUrl] = {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          };
        }

        // Match study URLs to the fetched metrics
        for (const study of propertyStudies) {
          const normalizedUrl = study.url.toLowerCase();
          // Try exact match first
          if (urlMetrics[normalizedUrl]) {
            results[study.url] = urlMetrics[normalizedUrl];
          } else {
            // Try partial match (URL might have trailing slashes or query params)
            for (const [pageUrl, metrics] of Object.entries(urlMetrics)) {
              if (pageUrl.includes(normalizedUrl) || normalizedUrl.includes(pageUrl)) {
                results[study.url] = metrics;
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching GSC data for ${siteUrl}:`, error);
    }
  }

  return results;
};

// List available Search Console sites
export const fetchSearchConsoleSites = async (accessToken) => {
  const url = 'https://www.googleapis.com/webmasters/v3/sites';

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorMessage = await extractApiErrorMessage(response, 'Failed to fetch sites');
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.siteEntry || [];
};

// List available GA4 properties
export const fetchGA4Properties = async (accessToken) => {
  const url = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries';

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorMessage = await extractApiErrorMessage(response, 'Failed to fetch GA4 properties');
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const properties = [];

  if (data.accountSummaries) {
    data.accountSummaries.forEach(account => {
      if (account.propertySummaries) {
        account.propertySummaries.forEach(prop => {
          properties.push({
            propertyId: prop.property.split('/')[1],
            displayName: prop.displayName,
            accountName: account.displayName,
          });
        });
      }
    });
  }

  return properties;
};
