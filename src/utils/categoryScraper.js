// Web scraping utility for category pages
// Fetches studies from LawnStarter and Lawn Love category pages

const CATEGORY_URLS = {
  lawnstarter: 'https://www.lawnstarter.com/blog/category/studies/',
  lawnlove: 'https://lawnlove.com/blog/category/studies/',
};

// Serverless API endpoint for Lawn Love (avoids CORS issues)
const LAWN_LOVE_API_URL = '/api/scrape-lawnlove';

// CORS proxy for client-side fetching - try multiple proxies for reliability
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
];

// Currently selected proxy (will rotate on failure)
let currentProxyIndex = 0;

// Brand status tracking
export const BRAND_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// Storage key for cached archive data
const ARCHIVE_STORAGE_KEY = 'story-archive-data';
const ARCHIVE_TIMESTAMP_KEY = 'story-archive-timestamp';

// Get cached archive data
export const getCachedArchive = () => {
  try {
    const cached = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    const timestamp = localStorage.getItem(ARCHIVE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      return {
        studies: JSON.parse(cached),
        timestamp: timestamp,
      };
    }
  } catch (e) {
    console.error('Error reading cached archive:', e);
  }
  return null;
};

// Save archive data to cache
export const saveCachedArchive = (studies) => {
  try {
    const timestamp = new Date().toISOString();
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(studies));
    localStorage.setItem(ARCHIVE_TIMESTAMP_KEY, timestamp);
    return timestamp;
  } catch (e) {
    console.error('Error saving cached archive:', e);
  }
  return null;
};

// Clear cached archive
export const clearCachedArchive = () => {
  localStorage.removeItem(ARCHIVE_STORAGE_KEY);
  localStorage.removeItem(ARCHIVE_TIMESTAMP_KEY);
};

// Parse date from various formats commonly found in blog posts
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  // Clean up the date string
  const cleaned = dateStr.trim();

  // Try common formats
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  // Handle "Month DD, YYYY" format
  const monthMatch = cleaned.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
    if (monthIndex !== -1) {
      return `${monthMatch[3]}-${String(monthIndex + 1).padStart(2, '0')}-${monthMatch[2].padStart(2, '0')}`;
    }
  }

  return null;
};

// Extract year from a date string
const extractYear = (dateStr) => {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
};

// Parse LawnStarter category page HTML
const parseLawnStarterPage = (html, pageUrl) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const studies = [];

  // LawnStarter uses article cards - look for various common selectors
  const articleSelectors = [
    'article',
    '.post',
    '.blog-post',
    '.entry',
    '.post-item',
    '[class*="article"]',
    '[class*="post"]',
  ];

  let articles = [];
  for (const selector of articleSelectors) {
    articles = doc.querySelectorAll(selector);
    if (articles.length > 0) break;
  }

  // If no articles found, try to find links to studies
  if (articles.length === 0) {
    const links = doc.querySelectorAll('a[href*="/blog/studies/"]');
    const seen = new Set();

    links.forEach(link => {
      const url = link.href;
      if (seen.has(url) || url === pageUrl) return;
      seen.add(url);

      // Get the title from the link text or parent heading
      let title = link.textContent.trim();
      const parentHeading = link.closest('h1, h2, h3, h4');
      if (parentHeading) {
        title = parentHeading.textContent.trim();
      }

      if (title && title.length > 5) {
        studies.push({
          id: `ls-${url.split('/').filter(Boolean).pop() || Date.now()}`,
          title: title,
          url: url,
          brand: 'LawnStarter',
          publishDate: null,
          excerpt: null,
          image: null,
        });
      }
    });

    return studies;
  }

  articles.forEach((article, index) => {
    try {
      // Find title and URL
      const titleLink = article.querySelector('a[href*="/blog/"]') ||
                        article.querySelector('h1 a, h2 a, h3 a, h4 a') ||
                        article.querySelector('a');

      if (!titleLink) return;

      const url = titleLink.href;
      // Skip if it's the category page itself
      if (url === pageUrl || url.endsWith('/studies/') || url.endsWith('/studies')) return;

      const titleEl = article.querySelector('h1, h2, h3, h4, .entry-title, .post-title, [class*="title"]');
      const title = titleEl ? titleEl.textContent.trim() : titleLink.textContent.trim();

      // Find publish date
      const dateEl = article.querySelector('time, .date, .post-date, .entry-date, [class*="date"], [datetime]');
      let publishDate = null;
      if (dateEl) {
        publishDate = dateEl.getAttribute('datetime') || dateEl.textContent;
        publishDate = parseDate(publishDate);
      }

      // Find excerpt
      const excerptEl = article.querySelector('.excerpt, .entry-summary, .post-excerpt, p, [class*="excerpt"]');
      const excerpt = excerptEl ? excerptEl.textContent.trim().substring(0, 200) : null;

      // Find featured image
      const imgEl = article.querySelector('img');
      const image = imgEl ? (imgEl.src || imgEl.dataset.src) : null;

      if (title && url) {
        studies.push({
          id: `ls-${index}-${Date.now()}`,
          title: title,
          url: url,
          brand: 'LawnStarter',
          publishDate: publishDate,
          excerpt: excerpt,
          image: image,
        });
      }
    } catch (e) {
      console.error('Error parsing article:', e);
    }
  });

  return studies;
};

// Parse Lawn Love category page HTML
const parseLawnLovePage = (html, pageUrl) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const studies = [];

  // Similar parsing logic for Lawn Love
  const articleSelectors = [
    'article',
    '.post',
    '.blog-post',
    '.entry',
    '.post-item',
    '[class*="article"]',
    '[class*="post"]',
  ];

  let articles = [];
  for (const selector of articleSelectors) {
    articles = doc.querySelectorAll(selector);
    if (articles.length > 0) break;
  }

  // If no articles found, try to find links to studies
  if (articles.length === 0) {
    const links = doc.querySelectorAll('a[href*="/blog/"]');
    const seen = new Set();

    links.forEach(link => {
      const url = link.href;
      if (seen.has(url) || url === pageUrl || !url.includes('lawnlove.com')) return;
      // Skip category/tag pages
      if (url.includes('/category/') || url.includes('/tag/')) return;
      seen.add(url);

      let title = link.textContent.trim();
      const parentHeading = link.closest('h1, h2, h3, h4');
      if (parentHeading) {
        title = parentHeading.textContent.trim();
      }

      if (title && title.length > 5 && !title.toLowerCase().includes('read more')) {
        studies.push({
          id: `ll-${url.split('/').filter(Boolean).pop() || Date.now()}`,
          title: title,
          url: url,
          brand: 'Lawn Love',
          publishDate: null,
          excerpt: null,
          image: null,
        });
      }
    });

    return studies;
  }

  articles.forEach((article, index) => {
    try {
      const titleLink = article.querySelector('a[href*="/blog/"]') ||
                        article.querySelector('h1 a, h2 a, h3 a, h4 a') ||
                        article.querySelector('a');

      if (!titleLink) return;

      const url = titleLink.href;
      if (url === pageUrl || url.endsWith('/studies/') || url.endsWith('/studies')) return;

      const titleEl = article.querySelector('h1, h2, h3, h4, .entry-title, .post-title, [class*="title"]');
      const title = titleEl ? titleEl.textContent.trim() : titleLink.textContent.trim();

      const dateEl = article.querySelector('time, .date, .post-date, .entry-date, [class*="date"], [datetime]');
      let publishDate = null;
      if (dateEl) {
        publishDate = dateEl.getAttribute('datetime') || dateEl.textContent;
        publishDate = parseDate(publishDate);
      }

      const excerptEl = article.querySelector('.excerpt, .entry-summary, .post-excerpt, p, [class*="excerpt"]');
      const excerpt = excerptEl ? excerptEl.textContent.trim().substring(0, 200) : null;

      const imgEl = article.querySelector('img');
      const image = imgEl ? (imgEl.src || imgEl.dataset.src) : null;

      if (title && url) {
        studies.push({
          id: `ll-${index}-${Date.now()}`,
          title: title,
          url: url,
          brand: 'Lawn Love',
          publishDate: publishDate,
          excerpt: excerpt,
          image: image,
        });
      }
    } catch (e) {
      console.error('Error parsing article:', e);
    }
  });

  return studies;
};

// Fetch Lawn Love studies via serverless API (avoids CORS)
const fetchLawnLoveViaApi = async () => {
  try {
    const response = await fetch(LAWN_LOVE_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data.studies || [];
  } catch (error) {
    console.error('Lawn Love API fetch failed:', error);
    throw error;
  }
};

// Check if the response HTML is a proxy error page
const isProxyErrorResponse = (html) => {
  const lowerHtml = html.toLowerCase();
  // Common error patterns from CORS proxies
  return (
    lowerHtml.includes('access denied') ||
    lowerHtml.includes('rate limit') ||
    lowerHtml.includes('too many requests') ||
    lowerHtml.includes('403 forbidden') ||
    lowerHtml.includes('429 too many') ||
    lowerHtml.includes('blocked') ||
    lowerHtml.includes('captcha') ||
    lowerHtml.includes('cloudflare') ||
    (lowerHtml.includes('error') && html.length < 2000) ||
    // Check if it's clearly not a blog page
    (!lowerHtml.includes('blog') && !lowerHtml.includes('article') && html.length < 5000)
  );
};

// Try to fetch with different proxies
const fetchWithProxy = async (targetUrl) => {
  const errors = [];

  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
    const proxy = CORS_PROXIES[proxyIndex];
    const proxyUrl = `${proxy}${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html',
          'Origin': window.location.origin,
        },
      });

      if (!response.ok) {
        errors.push(`${proxy}: HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Check if the proxy returned an error page instead of actual content
      if (isProxyErrorResponse(html)) {
        errors.push(`${proxy}: Proxy returned error/blocked page`);
        continue;
      }

      // Check for minimum content length
      if (!html || html.length < 500) {
        errors.push(`${proxy}: Response too short (${html?.length || 0} bytes)`);
        continue;
      }

      // Success - remember this proxy for future requests
      currentProxyIndex = proxyIndex;
      return { html, proxyUsed: proxy };

    } catch (error) {
      errors.push(`${proxy}: ${error.message}`);
    }
  }

  // All proxies failed
  throw new Error(`All CORS proxies failed:\n${errors.join('\n')}`);
};

// Fetch and parse multiple pages for pagination
const fetchAllPages = async (baseUrl, brand, parseFunction, onProgress) => {
  const allStudies = [];
  const seenUrls = new Set();
  let page = 1;
  const maxPages = 10; // Limit to prevent infinite loops
  let firstPageError = null;

  while (page <= maxPages) {
    try {
      const pageUrl = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;

      const { html, proxyUsed } = await fetchWithProxy(pageUrl);

      if (page === 1) {
        console.log(`Successfully fetched ${brand} using proxy: ${proxyUsed}`);
      }

      const studies = parseFunction(html, pageUrl);

      // If first page returns no studies, something might be wrong with parsing
      if (page === 1 && studies.length === 0) {
        console.warn(`Warning: No studies found on first page for ${brand}. HTML length: ${html.length}`);
        // Log a snippet of the HTML for debugging
        console.log('HTML snippet:', html.substring(0, 500));
        firstPageError = `No studies found on ${brand} category page. The website structure may have changed.`;
      }

      // Filter out duplicates
      let newStudiesCount = 0;
      studies.forEach(study => {
        if (!seenUrls.has(study.url)) {
          seenUrls.add(study.url);
          allStudies.push(study);
          newStudiesCount++;
        }
      });

      // If no new studies found, we've probably hit the end
      if (newStudiesCount === 0) {
        break;
      }

      page++;

      // Small delay between requests to be polite
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Error fetching page ${page} for ${brand}:`, error);
      // If first page fails, throw the error
      if (page === 1) {
        throw new Error(`Failed to fetch ${brand} studies: ${error.message}`);
      }
      // For subsequent pages, just stop pagination
      break;
    }
  }

  // If we got no studies and had a first page parsing issue, throw an error
  if (allStudies.length === 0 && firstPageError) {
    throw new Error(firstPageError);
  }

  return allStudies;
};

// Main function to scrape all category pages
export const scrapeAllCategoryPages = async (onProgress, onBrandStatus) => {
  const allStudies = [];
  const brandResults = {
    lawnstarter: { status: BRAND_STATUS.IDLE, studies: [], error: null },
    lawnlove: { status: BRAND_STATUS.IDLE, studies: [], error: null },
  };

  // Fetch LawnStarter studies (via CORS proxy)
  try {
    if (onBrandStatus) onBrandStatus('lawnstarter', BRAND_STATUS.LOADING);
    if (onProgress) onProgress('Fetching LawnStarter studies...');

    const lawnstarterStudies = await fetchAllPages(
      CATEGORY_URLS.lawnstarter,
      'LawnStarter',
      parseLawnStarterPage
    );

    brandResults.lawnstarter = {
      status: BRAND_STATUS.SUCCESS,
      studies: lawnstarterStudies,
      error: null,
    };
    allStudies.push(...lawnstarterStudies);

    if (onBrandStatus) onBrandStatus('lawnstarter', BRAND_STATUS.SUCCESS);
    if (onProgress) onProgress(`Found ${lawnstarterStudies.length} LawnStarter studies`);
  } catch (error) {
    console.error('Error fetching LawnStarter:', error);
    brandResults.lawnstarter = {
      status: BRAND_STATUS.ERROR,
      studies: [],
      error: error.message,
    };
    if (onBrandStatus) onBrandStatus('lawnstarter', BRAND_STATUS.ERROR, error.message);
  }

  // Fetch Lawn Love studies - try API first, then fall back to CORS proxy
  try {
    if (onBrandStatus) onBrandStatus('lawnlove', BRAND_STATUS.LOADING);
    if (onProgress) onProgress('Fetching Lawn Love studies via API...');

    let lawnloveStudies = [];

    // Try the serverless API first (avoids CORS issues)
    try {
      lawnloveStudies = await fetchLawnLoveViaApi();
      if (onProgress) onProgress(`Found ${lawnloveStudies.length} Lawn Love studies via API`);
    } catch (apiError) {
      console.warn('Lawn Love API failed, trying CORS proxy fallback:', apiError);
      if (onProgress) onProgress('API failed, trying CORS proxy for Lawn Love...');

      // Fall back to CORS proxy
      lawnloveStudies = await fetchAllPages(
        CATEGORY_URLS.lawnlove,
        'Lawn Love',
        parseLawnLovePage
      );
    }

    brandResults.lawnlove = {
      status: BRAND_STATUS.SUCCESS,
      studies: lawnloveStudies,
      error: null,
    };
    allStudies.push(...lawnloveStudies);

    if (onBrandStatus) onBrandStatus('lawnlove', BRAND_STATUS.SUCCESS);
    if (onProgress) onProgress(`Found ${lawnloveStudies.length} Lawn Love studies`);
  } catch (error) {
    console.error('Error fetching Lawn Love:', error);
    brandResults.lawnlove = {
      status: BRAND_STATUS.ERROR,
      studies: [],
      error: error.message,
    };
    if (onBrandStatus) onBrandStatus('lawnlove', BRAND_STATUS.ERROR, error.message);
  }

  // Deduplicate by URL (in case of cross-posting)
  const uniqueStudies = [];
  const seenUrls = new Set();
  allStudies.forEach(study => {
    // Normalize URL for comparison
    const normalizedUrl = study.url.replace(/\/$/, '').toLowerCase();
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      uniqueStudies.push(study);
    }
  });

  // Sort by publish date (newest first), with null dates at the end
  uniqueStudies.sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return 0;
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return new Date(b.publishDate) - new Date(a.publishDate);
  });

  // Save to cache
  if (onProgress) onProgress('Saving to cache...');
  const timestamp = saveCachedArchive(uniqueStudies);

  // Build warnings list from brand errors
  const warnings = [];
  if (brandResults.lawnstarter.status === BRAND_STATUS.ERROR) {
    warnings.push(`LawnStarter: ${brandResults.lawnstarter.error}`);
  }
  if (brandResults.lawnlove.status === BRAND_STATUS.ERROR) {
    warnings.push(`Lawn Love: ${brandResults.lawnlove.error}`);
  }

  if (warnings.length > 0) {
    console.warn('Partial fetch errors:', warnings);
  }

  return {
    studies: uniqueStudies,
    timestamp: timestamp,
    warnings: warnings.length > 0 ? warnings : null,
    brandResults: brandResults,
  };
};

// Retry fetching only Lawn Love studies
export const retryLawnLove = async (currentStudies, onProgress, onBrandStatus) => {
  if (onBrandStatus) onBrandStatus('lawnlove', BRAND_STATUS.LOADING);
  if (onProgress) onProgress('Retrying Lawn Love studies via API...');

  try {
    let lawnloveStudies = [];

    // Try the serverless API first
    try {
      lawnloveStudies = await fetchLawnLoveViaApi();
      if (onProgress) onProgress(`Found ${lawnloveStudies.length} Lawn Love studies via API`);
    } catch (apiError) {
      console.warn('Lawn Love API retry failed, trying CORS proxy:', apiError);
      if (onProgress) onProgress('API failed, trying CORS proxy...');

      // Fall back to CORS proxy
      lawnloveStudies = await fetchAllPages(
        CATEGORY_URLS.lawnlove,
        'Lawn Love',
        parseLawnLovePage
      );
    }

    if (onBrandStatus) onBrandStatus('lawnlove', BRAND_STATUS.SUCCESS);

    // Merge with existing studies (remove old Lawn Love studies first)
    const filteredStudies = currentStudies.filter(s => s.brand !== 'Lawn Love');
    const allStudies = [...filteredStudies, ...lawnloveStudies];

    // Deduplicate
    const uniqueStudies = [];
    const seenUrls = new Set();
    allStudies.forEach(study => {
      const normalizedUrl = study.url.replace(/\/$/, '').toLowerCase();
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueStudies.push(study);
      }
    });

    // Sort by publish date
    uniqueStudies.sort((a, b) => {
      if (!a.publishDate && !b.publishDate) return 0;
      if (!a.publishDate) return 1;
      if (!b.publishDate) return -1;
      return new Date(b.publishDate) - new Date(a.publishDate);
    });

    // Update cache
    const timestamp = saveCachedArchive(uniqueStudies);

    return {
      studies: uniqueStudies,
      timestamp: timestamp,
      lawnloveCount: lawnloveStudies.length,
      success: true,
    };
  } catch (error) {
    console.error('Lawn Love retry failed:', error);
    if (onBrandStatus) onBrandStatus('lawnlove', BRAND_STATUS.ERROR, error.message);

    return {
      studies: currentStudies,
      success: false,
      error: error.message,
    };
  }
};

// Match scraped studies with Google Sheet data
export const matchStudiesWithSheetData = (scrapedStudies, sheetData) => {
  if (!sheetData || sheetData.length === 0) {
    return scrapedStudies;
  }

  // Create a lookup map from sheet URLs
  const sheetUrlMap = new Map();
  sheetData.forEach(row => {
    // Check various possible URL field names
    const url = row.study_url || row.url || row.story_url || row.link || '';
    if (url) {
      // Normalize URL for matching
      const normalizedUrl = url.replace(/\/$/, '').toLowerCase();
      sheetUrlMap.set(normalizedUrl, row);
    }
  });

  // Match studies with sheet data
  return scrapedStudies.map(study => {
    const normalizedUrl = study.url.replace(/\/$/, '').toLowerCase();
    const sheetRow = sheetUrlMap.get(normalizedUrl);

    if (sheetRow) {
      return {
        ...study,
        hasSheetData: true,
        // Map common field names from the sheet
        studyLinkNumber: sheetRow.study_link_ || sheetRow.link_ || sheetRow.links || sheetRow.total_links || null,
        avgOpenRate: sheetRow.average_o_r || sheetRow.avg_o_r || sheetRow.open_rate || null,
        avgClickRate: sheetRow.average_c_r || sheetRow.avg_c_r || sheetRow.click_rate || null,
        prevLinkNumber: sheetRow.prev_link_ || sheetRow.previous_links || null,
        // Additional metrics
        totalLinks: sheetRow.total_link_ || sheetRow.total_links || null,
        doFollowLinks: sheetRow.do_follow_links || sheetRow.dofollow || null,
        noFollowLinks: sheetRow.no_follow_links || sheetRow.nofollow || null,
        // Expert data
        expertsContacted: sheetRow._experts_contacted || sheetRow.experts_contacted || null,
        expertResponses: sheetRow._expert_responses || sheetRow.expert_responses || null,
        // Other metadata
        datePitched: sheetRow.date_pitched || sheetRow.pitch_date || null,
        notes: sheetRow.notes || null,
        // Links by year
        links2025: sheetRow['2025_link_'] || null,
        links2024: sheetRow['2024_link_'] || null,
        links2023: sheetRow['2023_link_'] || null,
        links2022: sheetRow['2022_link_'] || null,
        links2021: sheetRow['2021_link_'] || null,
        // National email metrics
        nationalOpenRate: sheetRow.national_o_r || null,
        nationalClickRate: sheetRow.national_c_r || null,
        nationalSends: sheetRow.national_sends || null,
        // Local email metrics
        localAvgOpenRate: sheetRow.average_o_r_local || null,
        localAvgClickRate: sheetRow.average_c_r_local || null,
        localSends: sheetRow.local_sends || null,
      };
    }

    return {
      ...study,
      hasSheetData: false,
    };
  });
};

// Get unique years from studies for filter
export const getYearsFromStudies = (studies) => {
  const years = new Set();
  studies.forEach(study => {
    const year = extractYear(study.publishDate);
    if (year) {
      years.add(year);
    }
  });
  return Array.from(years).sort((a, b) => b - a); // Descending
};

export { extractYear };
