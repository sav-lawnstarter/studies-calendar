// Vercel Serverless Function to scrape Lawn Love studies server-side
// This avoids CORS issues that occur when fetching from the browser

const LAWN_LOVE_BASE_URL = 'https://lawnlove.com/blog/category/studies/';

// Parse date from various formats commonly found in blog posts
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

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

// Simple HTML parser for server-side (no DOMParser available)
// Uses regex-based extraction as a fallback
const parseStudiesFromHtml = (html, pageUrl) => {
  const studies = [];
  const seenUrls = new Set();

  // Pattern to find article/post links with their context
  // Look for links to blog posts (excluding category/tag pages)
  const linkPattern = /<a[^>]*href=["']([^"']*lawnlove\.com\/blog\/[^"']+)["'][^>]*>([^<]*)<\/a>/gi;

  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    const linkText = match[2].trim();

    // Skip category, tag, and pagination pages
    if (url.includes('/category/') ||
        url.includes('/tag/') ||
        url.includes('/page/') ||
        url === pageUrl ||
        url.endsWith('/studies/') ||
        url.endsWith('/studies')) {
      continue;
    }

    // Skip if already seen
    const normalizedUrl = url.replace(/\/$/, '').toLowerCase();
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    // Skip if link text is too short or generic
    if (linkText.length < 5 ||
        linkText.toLowerCase().includes('read more') ||
        linkText.toLowerCase().includes('continue reading')) {
      continue;
    }

    const slug = url.split('/').filter(Boolean).pop() || `study-${Date.now()}`;

    studies.push({
      id: `ll-${slug}`,
      title: linkText,
      url: url,
      brand: 'Lawn Love',
      publishDate: null,
      excerpt: null,
      image: null,
    });
  }

  // Try to find better titles from heading tags
  const headingPattern = /<h[1-4][^>]*>[\s\S]*?<a[^>]*href=["']([^"']*lawnlove\.com\/blog\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-4]>/gi;

  while ((match = headingPattern.exec(html)) !== null) {
    const url = match[1];
    let title = match[2].replace(/<[^>]*>/g, '').trim();

    // Skip category, tag pages
    if (url.includes('/category/') || url.includes('/tag/') || url.includes('/page/')) {
      continue;
    }

    // Find and update the study with this URL
    const normalizedUrl = url.replace(/\/$/, '').toLowerCase();
    const existingStudy = studies.find(s =>
      s.url.replace(/\/$/, '').toLowerCase() === normalizedUrl
    );

    if (existingStudy && title.length > existingStudy.title.length) {
      existingStudy.title = title;
    } else if (!existingStudy && title.length > 5) {
      const slug = url.split('/').filter(Boolean).pop() || `study-${Date.now()}`;
      studies.push({
        id: `ll-${slug}`,
        title: title,
        url: url,
        brand: 'Lawn Love',
        publishDate: null,
        excerpt: null,
        image: null,
      });
    }
  }

  // Try to extract dates from time elements or date patterns near article links
  const timePattern = /<time[^>]*datetime=["']([^"']+)["'][^>]*>/gi;
  const foundDates = [];
  while ((match = timePattern.exec(html)) !== null) {
    const date = parseDate(match[1]);
    if (date) foundDates.push(date);
  }

  // If we found dates, try to associate them with studies by order
  if (foundDates.length > 0 && studies.length > 0) {
    for (let i = 0; i < Math.min(studies.length, foundDates.length); i++) {
      if (!studies[i].publishDate) {
        studies[i].publishDate = foundDates[i];
      }
    }
  }

  // Try to find images associated with studies
  const imgPattern = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const foundImages = [];
  while ((match = imgPattern.exec(html)) !== null) {
    const imgSrc = match[1];
    // Skip small icons, logos, and tracking pixels
    if (imgSrc.includes('logo') ||
        imgSrc.includes('icon') ||
        imgSrc.includes('avatar') ||
        imgSrc.includes('pixel') ||
        imgSrc.includes('1x1') ||
        imgSrc.includes('tracking')) {
      continue;
    }
    foundImages.push(imgSrc);
  }

  // Associate images with studies by order (best effort)
  if (foundImages.length > 0 && studies.length > 0) {
    for (let i = 0; i < Math.min(studies.length, foundImages.length); i++) {
      if (!studies[i].image) {
        studies[i].image = foundImages[i];
      }
    }
  }

  return studies;
};

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const page = parseInt(req.query.page) || 1;
  const maxPages = parseInt(req.query.maxPages) || 10;

  try {
    const allStudies = [];
    const seenUrls = new Set();
    let currentPage = 1;
    let hasMorePages = true;

    while (currentPage <= maxPages && hasMorePages) {
      const pageUrl = currentPage === 1
        ? LAWN_LOVE_BASE_URL
        : `${LAWN_LOVE_BASE_URL}page/${currentPage}/`;

      console.log(`Fetching Lawn Love page ${currentPage}: ${pageUrl}`);

      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        // If it's a 404, we've likely reached the end of pagination
        if (response.status === 404) {
          console.log(`Page ${currentPage} returned 404 - end of pagination`);
          hasMorePages = false;
          break;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Check for valid content
      if (html.length < 1000) {
        console.log(`Page ${currentPage} returned too little content`);
        hasMorePages = false;
        break;
      }

      const studies = parseStudiesFromHtml(html, pageUrl);
      console.log(`Found ${studies.length} studies on page ${currentPage}`);

      // Add new studies (deduplicate)
      let newCount = 0;
      for (const study of studies) {
        const normalizedUrl = study.url.replace(/\/$/, '').toLowerCase();
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          allStudies.push(study);
          newCount++;
        }
      }

      // If no new studies found, we've likely reached the end
      if (newCount === 0) {
        console.log(`No new studies found on page ${currentPage} - end of pagination`);
        hasMorePages = false;
        break;
      }

      currentPage++;

      // Small delay between pages to be polite
      if (hasMorePages && currentPage <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return res.status(200).json({
      success: true,
      studies: allStudies,
      totalPages: currentPage - 1,
      totalStudies: allStudies.length,
    });

  } catch (error) {
    console.error('Error scraping Lawn Love:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      studies: [],
    });
  }
}
