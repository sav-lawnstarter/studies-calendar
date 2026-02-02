// Vercel Serverless Function to scrape article metadata from URLs
// This avoids CORS issues that occur when fetching from the browser

// Parse date from various formats commonly found in articles
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Try standard Date parsing first
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

  // Handle "DD Month YYYY" format
  const dayFirstMatch = cleaned.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (dayFirstMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = monthNames.indexOf(dayFirstMatch[2].toLowerCase());
    if (monthIndex !== -1) {
      return `${dayFirstMatch[3]}-${String(monthIndex + 1).padStart(2, '0')}-${dayFirstMatch[1].padStart(2, '0')}`;
    }
  }

  return null;
};

// Extract domain/publisher name from URL
const extractPublisher = (url) => {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.replace(/^www\./, '');

    // Common publisher name mappings
    const publisherMap = {
      'trugreen.com': 'TruGreen',
      'scotts.com': 'Scotts',
      'sunday.com': 'Sunday Lawn Care',
      'lawnstarter.com': 'LawnStarter',
      'lawnlove.com': 'Lawn Love',
      'thisoldhouse.com': 'This Old House',
      'bhg.com': 'Better Homes & Gardens',
      'hgtv.com': 'HGTV',
      'bobvila.com': 'Bob Vila',
      'familyhandyman.com': 'Family Handyman',
    };

    if (publisherMap[hostname]) {
      return publisherMap[hostname];
    }

    // Generate a readable name from hostname
    const parts = hostname.split('.');
    const name = parts[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return name;
  } catch {
    return 'Unknown';
  }
};

// Parse article metadata from HTML
const parseArticleMetadata = (html, url) => {
  const metadata = {
    title: null,
    publisher: extractPublisher(url),
    publishDate: null,
  };

  // Extract title - try multiple sources
  // 1. Open Graph title
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (ogTitleMatch) {
    metadata.title = ogTitleMatch[1].trim();
  }

  // 2. Twitter title
  if (!metadata.title) {
    const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:title["']/i);
    if (twitterTitleMatch) {
      metadata.title = twitterTitleMatch[1].trim();
    }
  }

  // 3. Regular title tag
  if (!metadata.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      // Clean up title - remove site name suffix
      let title = titleMatch[1].trim();
      title = title.replace(/\s*[\|–\-]\s*[^|\-–]+$/, '').trim();
      metadata.title = title;
    }
  }

  // 4. H1 tag
  if (!metadata.title) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      metadata.title = h1Match[1].trim();
    }
  }

  // Decode HTML entities in title
  if (metadata.title) {
    metadata.title = metadata.title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  // Extract publisher name - try multiple sources
  // 1. Open Graph site name
  const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (ogSiteNameMatch) {
    metadata.publisher = ogSiteNameMatch[1].trim();
  }

  // 2. Schema.org publisher
  if (!ogSiteNameMatch) {
    const publisherMatch = html.match(/"publisher"\s*:\s*\{\s*"@type"\s*:\s*"Organization"\s*,\s*"name"\s*:\s*"([^"]+)"/i);
    if (publisherMatch) {
      metadata.publisher = publisherMatch[1].trim();
    }
  }

  // Extract publish date - try multiple sources
  // 1. Schema.org datePublished
  const schemaDateMatch = html.match(/"datePublished"\s*:\s*"([^"]+)"/i);
  if (schemaDateMatch) {
    metadata.publishDate = parseDate(schemaDateMatch[1]);
  }

  // 2. Open Graph article:published_time
  if (!metadata.publishDate) {
    const ogDateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i);
    if (ogDateMatch) {
      metadata.publishDate = parseDate(ogDateMatch[1]);
    }
  }

  // 3. Time element with datetime attribute
  if (!metadata.publishDate) {
    const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*>/i);
    if (timeMatch) {
      metadata.publishDate = parseDate(timeMatch[1]);
    }
  }

  // 4. Meta date tag
  if (!metadata.publishDate) {
    const metaDateMatch = html.match(/<meta[^>]*name=["'](?:date|pubdate|publish_date|publication_date)["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["'](?:date|pubdate|publish_date|publication_date)["']/i);
    if (metaDateMatch) {
      metadata.publishDate = parseDate(metaDateMatch[1]);
    }
  }

  // 5. DC.date meta tag
  if (!metadata.publishDate) {
    const dcDateMatch = html.match(/<meta[^>]*name=["']DC\.date["'][^>]*content=["']([^"']+)["']/i);
    if (dcDateMatch) {
      metadata.publishDate = parseDate(dcDateMatch[1]);
    }
  }

  return metadata;
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

  const url = req.query.url || req.body?.url;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL parameter is required',
    });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format',
    });
  }

  try {
    console.log(`Scraping article metadata from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Check for valid HTML content
    if (html.length < 500) {
      throw new Error('Page returned too little content');
    }

    const metadata = parseArticleMetadata(html, url);

    return res.status(200).json({
      success: true,
      data: metadata,
      url: url,
    });

  } catch (error) {
    console.error('Error scraping URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      url: url,
    });
  }
}
