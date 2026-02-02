// Vercel Serverless Function to fetch and parse RSS feeds
// This avoids CORS issues that occur when fetching from the browser

// Simple XML parser for RSS feeds
const parseRssXml = (xml, sourceName) => {
  const items = [];

  // Try to find items in RSS 2.0 format
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const itemXml = match[1];

    // Extract title
    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch ? cleanText(titleMatch[1]) : null;

    // Extract link
    const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const link = linkMatch ? cleanText(linkMatch[1]) : null;

    // Extract description
    const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const description = descMatch ? cleanText(descMatch[1]).slice(0, 300) : null;

    // Extract publish date
    const pubDateMatch = itemXml.match(/<pubDate[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
    const pubDate = pubDateMatch ? parseDate(cleanText(pubDateMatch[1])) : null;

    if (title && link) {
      items.push({
        title,
        link,
        description: stripHtml(description),
        pubDate,
        source: sourceName,
      });
    }
  }

  // If no RSS 2.0 items found, try Atom format
  if (items.length === 0) {
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi);

    for (const match of entryMatches) {
      const entryXml = match[1];

      // Extract title
      const titleMatch = entryXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? cleanText(titleMatch[1]) : null;

      // Extract link (Atom uses href attribute)
      const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      const link = linkMatch ? linkMatch[1] : null;

      // Extract summary/content
      const summaryMatch = entryXml.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i) ||
                           entryXml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
      const description = summaryMatch ? cleanText(summaryMatch[1]).slice(0, 300) : null;

      // Extract publish date
      const publishedMatch = entryXml.match(/<published[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/published>/i) ||
                             entryXml.match(/<updated[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/updated>/i);
      const pubDate = publishedMatch ? parseDate(cleanText(publishedMatch[1])) : null;

      if (title && link) {
        items.push({
          title,
          link,
          description: stripHtml(description),
          pubDate,
          source: sourceName,
        });
      }
    }
  }

  return items;
};

// Clean text from XML
const cleanText = (text) => {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

// Strip HTML tags from text
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Parse date string to ISO format
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Ignore parsing errors
  }

  return null;
};

// Fetch a single RSS feed with timeout
const fetchFeed = async (source, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LawnStarter Editorial Bot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch ${source.name}: HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items = parseRssXml(xml, source.name);

    console.log(`Fetched ${items.length} items from ${source.name}`);
    return items;

  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error fetching ${source.name}:`, error.message);
    return [];
  }
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get sources from request body or use defaults
  const sources = req.body?.sources || [
    { id: 'lawnandlandscape', name: 'Lawn & Landscape', url: 'https://www.lawnandlandscape.com/rss', category: 'industry' },
    { id: 'greenindustrypros', name: 'Green Industry Pros', url: 'https://www.greenindustrypros.com/rss', category: 'industry' },
  ];

  try {
    console.log(`Fetching ${sources.length} RSS feeds...`);

    // Fetch all feeds concurrently
    const feedPromises = sources.map(source => fetchFeed(source));
    const feedResults = await Promise.all(feedPromises);

    // Flatten all items and sort by date (newest first)
    let allItems = feedResults.flat();

    // Sort by publish date, newest first
    allItems.sort((a, b) => {
      if (!a.pubDate && !b.pubDate) return 0;
      if (!a.pubDate) return 1;
      if (!b.pubDate) return -1;
      return new Date(b.pubDate) - new Date(a.pubDate);
    });

    // Deduplicate by URL
    const seen = new Set();
    allItems = allItems.filter(item => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    });

    console.log(`Returning ${allItems.length} total items`);

    return res.status(200).json({
      success: true,
      items: allItems,
      fetchedAt: new Date().toISOString(),
      sourceCount: sources.length,
    });

  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
