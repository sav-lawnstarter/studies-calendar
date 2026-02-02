import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Rss,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  Calendar,
  X,
  Trash2,
  Edit3,
  Filter,
  Sun,
  Snowflake,
  Leaf,
  Cloud,
  Flame,
  AlertCircle,
  CheckCircle,
  BookmarkPlus,
  Tag,
  Globe,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  Sparkles,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, isBefore, getMonth } from 'date-fns';

// localStorage keys
const STORAGE_KEY_TOPICS = 'editorial-trending-topics';
const STORAGE_KEY_RSS_SOURCES = 'editorial-rss-sources';
const STORAGE_KEY_RSS_CACHE = 'editorial-rss-cache';

// Default RSS sources for lawn care industry
const DEFAULT_RSS_SOURCES = [
  { id: 'lawnandlandscape', name: 'Lawn & Landscape', url: 'https://www.lawnandlandscape.com/rss', category: 'industry' },
  { id: 'groundsmag', name: 'Grounds Maintenance', url: 'https://www.groundsmag.com/rss', category: 'industry' },
  { id: 'turfmag', name: 'Turf Magazine', url: 'https://www.turfmagazine.com/feed/', category: 'industry' },
  { id: 'greenindustrypros', name: 'Green Industry Pros', url: 'https://www.greenindustrypros.com/rss', category: 'industry' },
  { id: 'landscapemanagement', name: 'Landscape Management', url: 'https://www.landscapemanagement.net/feed/', category: 'industry' },
];

// Seasonal topics configuration
const SEASONAL_TOPICS = {
  spring: {
    icon: Leaf,
    color: 'green',
    months: [2, 3, 4], // Mar, Apr, May
    topics: [
      { term: 'lawn aeration', description: 'Peak time for core aeration services' },
      { term: 'spring fertilization', description: 'First fertilizer application of the year' },
      { term: 'pre-emergent herbicide', description: 'Crabgrass prevention timing' },
      { term: 'overseeding', description: 'Cool-season grass repair' },
      { term: 'lawn dethatching', description: 'Remove winter debris and thatch' },
      { term: 'irrigation startup', description: 'Sprinkler system activation' },
    ],
  },
  summer: {
    icon: Sun,
    color: 'yellow',
    months: [5, 6, 7], // Jun, Jul, Aug
    topics: [
      { term: 'drought resistant grass', description: 'Water conservation strategies' },
      { term: 'lawn watering schedule', description: 'Optimal irrigation timing' },
      { term: 'grub control', description: 'Japanese beetle larvae prevention' },
      { term: 'heat stress lawn', description: 'Summer dormancy management' },
      { term: 'mosquito control', description: 'Backyard pest management' },
      { term: 'mowing height summer', description: 'Taller cuts for heat protection' },
    ],
  },
  fall: {
    icon: Cloud,
    color: 'orange',
    months: [8, 9, 10], // Sep, Oct, Nov
    topics: [
      { term: 'fall lawn care', description: 'End-of-season maintenance' },
      { term: 'leaf removal', description: 'Fall cleanup services' },
      { term: 'fall overseeding', description: 'Best time for cool-season seeding' },
      { term: 'winterizer fertilizer', description: 'Final fertilizer application' },
      { term: 'lawn disease fall', description: 'Brown patch and fungus prevention' },
      { term: 'aeration and seeding', description: 'Combined fall services' },
    ],
  },
  winter: {
    icon: Snowflake,
    color: 'blue',
    months: [11, 0, 1], // Dec, Jan, Feb
    topics: [
      { term: 'lawn winterization', description: 'Preparing for cold weather' },
      { term: 'snow mold prevention', description: 'Cold weather disease prevention' },
      { term: 'lawn care planning', description: 'Next year preparation' },
      { term: 'ice melt lawn damage', description: 'Salt damage prevention' },
      { term: 'dormant lawn care', description: 'Winter lawn maintenance' },
      { term: 'equipment maintenance', description: 'Off-season equipment care' },
    ],
  },
};

// Load data from localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Save data to localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

// Format relative time
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Unknown';
  try {
    const date = parseISO(dateStr);
    const days = differenceInDays(new Date(), date);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

// Get current season
const getCurrentSeason = () => {
  const month = getMonth(new Date());
  if (SEASONAL_TOPICS.spring.months.includes(month)) return 'spring';
  if (SEASONAL_TOPICS.summer.months.includes(month)) return 'summer';
  if (SEASONAL_TOPICS.fall.months.includes(month)) return 'fall';
  return 'winter';
};

export default function TrendingTopics() {
  // Manual topics state
  const [topics, setTopics] = useState(() => loadFromStorage(STORAGE_KEY_TOPICS, []));

  // RSS sources and feed items
  const [rssSources, setRssSources] = useState(() => loadFromStorage(STORAGE_KEY_RSS_SOURCES, DEFAULT_RSS_SOURCES));
  const [feedItems, setFeedItems] = useState(() => loadFromStorage(STORAGE_KEY_RSS_CACHE, { items: [], lastFetched: null }));
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(false);
  const [feedError, setFeedError] = useState(null);

  // Google Trends data
  const [trendsData, setTrendsData] = useState([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [trendsError, setTrendsError] = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('trends');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeason, setFilterSeason] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const currentSeason = getCurrentSeason();
  const SeasonIcon = SEASONAL_TOPICS[currentSeason].icon;

  // Save topics to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEY_TOPICS, topics);
  }, [topics]);

  // Save RSS sources to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEY_RSS_SOURCES, rssSources);
  }, [rssSources]);

  // Fetch RSS feeds
  const fetchRssFeeds = useCallback(async () => {
    setIsLoadingFeeds(true);
    setFeedError(null);

    try {
      const response = await fetch('/api/fetch-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: rssSources }),
      });

      const result = await response.json();

      if (result.success) {
        const cacheData = {
          items: result.items,
          lastFetched: new Date().toISOString(),
        };
        setFeedItems(cacheData);
        saveToStorage(STORAGE_KEY_RSS_CACHE, cacheData);
      } else {
        setFeedError(result.error || 'Failed to fetch RSS feeds');
      }
    } catch (err) {
      console.error('RSS fetch error:', err);
      setFeedError('Unable to fetch RSS feeds. Check your connection.');
    } finally {
      setIsLoadingFeeds(false);
    }
  }, [rssSources]);

  // Fetch Google Trends data
  const fetchTrendsData = useCallback(async () => {
    setIsLoadingTrends(true);
    setTrendsError(null);

    try {
      const response = await fetch('/api/google-trends');
      const result = await response.json();

      if (result.success) {
        setTrendsData(result.trends);
      } else {
        setTrendsError(result.error || 'Failed to fetch Google Trends data');
      }
    } catch (err) {
      console.error('Trends fetch error:', err);
      setTrendsError('Unable to fetch trends data. Check your connection.');
    } finally {
      setIsLoadingTrends(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTrendsData();
    // Only fetch RSS if cache is older than 1 hour
    const cacheAge = feedItems.lastFetched
      ? differenceInDays(new Date(), parseISO(feedItems.lastFetched)) * 24
      : Infinity;
    if (cacheAge > 1 || feedItems.items.length === 0) {
      fetchRssFeeds();
    }
  }, []);

  // Add a new manual topic
  const handleAddTopic = (topicData) => {
    const newTopic = {
      id: `topic-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      ...topicData,
    };
    setTopics((prev) => [newTopic, ...prev]);
    setShowAddModal(false);
  };

  // Update a topic
  const handleUpdateTopic = (topicData) => {
    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === editingTopic.id ? { ...topic, ...topicData } : topic
      )
    );
    setEditingTopic(null);
    setShowAddModal(false);
  };

  // Delete a topic
  const handleDeleteTopic = (topicId) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      setTopics((prev) => prev.filter((topic) => topic.id !== topicId));
    }
  };

  // Add RSS source
  const handleAddSource = (sourceData) => {
    const newSource = {
      id: `source-${Date.now()}`,
      ...sourceData,
    };
    setRssSources((prev) => [...prev, newSource]);
    setShowAddSourceModal(false);
  };

  // Remove RSS source
  const handleRemoveSource = (sourceId) => {
    if (window.confirm('Remove this RSS source?')) {
      setRssSources((prev) => prev.filter((s) => s.id !== sourceId));
    }
  };

  // Save topic from feed item
  const saveFromFeed = (item) => {
    const newTopic = {
      id: `topic-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      title: item.title,
      source: item.source,
      url: item.link,
      type: 'news',
      priority: 'medium',
      notes: `Saved from ${item.source} RSS feed`,
      season: currentSeason,
    };
    setTopics((prev) => [newTopic, ...prev]);
  };

  // Save topic from trends
  const saveFromTrend = (trend) => {
    const newTopic = {
      id: `topic-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      title: trend.term,
      type: 'trend',
      priority: trend.rising ? 'high' : 'medium',
      notes: `Trending search term. Interest: ${trend.interest}%`,
      season: currentSeason,
      trendData: {
        interest: trend.interest,
        rising: trend.rising,
      },
    };
    setTopics((prev) => [newTopic, ...prev]);
  };

  // Save seasonal topic
  const saveSeasonalTopic = (topic, season) => {
    const exists = topics.some(
      (t) => t.title.toLowerCase() === topic.term.toLowerCase() && t.season === season
    );
    if (exists) {
      alert('This seasonal topic is already saved.');
      return;
    }

    const newTopic = {
      id: `topic-${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
      title: topic.term,
      type: 'seasonal',
      priority: season === currentSeason ? 'high' : 'low',
      notes: topic.description,
      season,
    };
    setTopics((prev) => [newTopic, ...prev]);
  };

  // Filter topics
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          topic.title?.toLowerCase().includes(query) ||
          topic.notes?.toLowerCase().includes(query) ||
          topic.source?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (filterSeason !== 'all' && topic.season !== filterSeason) return false;
      if (filterPriority !== 'all' && topic.priority !== filterPriority) return false;

      return true;
    });
  }, [topics, searchQuery, filterSeason, filterPriority]);

  // Quick stats
  const quickStats = useMemo(() => {
    const seasonalTopics = topics.filter((t) => t.season === currentSeason);
    const highPriority = topics.filter((t) => t.priority === 'high');
    const recentNews = feedItems.items?.filter((item) => {
      try {
        return differenceInDays(new Date(), parseISO(item.pubDate)) <= 7;
      } catch {
        return false;
      }
    }) || [];

    return {
      totalTopics: topics.length,
      seasonalCount: seasonalTopics.length,
      highPriorityCount: highPriority.length,
      recentNewsCount: recentNews.length,
      trendingCount: trendsData.length,
    };
  }, [topics, feedItems, trendsData, currentSeason]);

  // Priority badge component
  const PriorityBadge = ({ priority }) => {
    const config = {
      high: { bg: 'bg-red-100', text: 'text-red-700', label: 'High' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
      low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
    };
    const c = config[priority] || config.medium;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  // Type badge component
  const TypeBadge = ({ type }) => {
    const config = {
      news: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Rss, label: 'News' },
      trend: { bg: 'bg-purple-100', text: 'text-purple-700', icon: TrendingUp, label: 'Trend' },
      seasonal: { bg: 'bg-green-100', text: 'text-green-700', icon: Calendar, label: 'Seasonal' },
      regulation: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, label: 'Regulation' },
      manual: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Tag, label: 'Manual' },
    };
    const c = config[type] || config.manual;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  // Season badge component
  const SeasonBadge = ({ season }) => {
    const config = SEASONAL_TOPICS[season];
    if (!config) return null;
    const Icon = config.icon;
    const colorClasses = {
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      orange: 'bg-orange-100 text-orange-700',
      blue: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[config.color]}`}>
        <Icon size={12} />
        {season.charAt(0).toUpperCase() + season.slice(1)}
      </span>
    );
  };

  // Trend direction indicator
  const TrendIndicator = ({ rising, interest }) => {
    if (rising) {
      return (
        <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
          <ArrowUp size={14} />
          Rising
        </span>
      );
    }
    if (interest > 50) {
      return (
        <span className="inline-flex items-center gap-1 text-yellow-600 text-sm font-medium">
          <Minus size={14} />
          Stable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-gray-500 text-sm font-medium">
        <ArrowDown size={14} />
        Declining
      </span>
    );
  };

  // Add/Edit Topic Modal
  const AddEditModal = () => {
    const [title, setTitle] = useState(editingTopic?.title || '');
    const [type, setType] = useState(editingTopic?.type || 'manual');
    const [priority, setPriority] = useState(editingTopic?.priority || 'medium');
    const [season, setSeason] = useState(editingTopic?.season || currentSeason);
    const [source, setSource] = useState(editingTopic?.source || '');
    const [url, setUrl] = useState(editingTopic?.url || '');
    const [notes, setNotes] = useState(editingTopic?.notes || '');

    const handleSubmit = () => {
      if (!title.trim()) return;

      const topicData = {
        title: title.trim(),
        type,
        priority,
        season,
        source: source.trim() || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingTopic) {
        handleUpdateTopic(topicData);
      } else {
        handleAddTopic(topicData);
      }
    };

    const handleClose = () => {
      setShowAddModal(false);
      setEditingTopic(null);
    };

    if (!showAddModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTopic ? 'Edit Topic' : 'Add Topic'}
              </h3>
              <p className="text-xs text-gray-500">Track industry news, trends, or ideas</p>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., New EPA lawn fertilizer regulations"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                >
                  <option value="manual">Manual</option>
                  <option value="news">News</option>
                  <option value="trend">Trend</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="regulation">Regulation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              >
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source (optional)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., Lawn & Landscape Magazine"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL (optional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="Why is this topic important? Story angle ideas..."
              />
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="w-full px-4 py-2 bg-ls-green text-white font-medium rounded-lg hover:bg-ls-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingTopic ? 'Save Changes' : 'Add Topic'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add RSS Source Modal
  const AddSourceModal = () => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState('industry');

    const handleSubmit = () => {
      if (!name.trim() || !url.trim()) return;
      handleAddSource({ name: name.trim(), url: url.trim(), category });
    };

    if (!showAddSourceModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddSourceModal(false)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Add RSS Source</h3>
            <button onClick={() => setShowAddSourceModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="e.g., Turf Magazine"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RSS Feed URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
                placeholder="https://example.com/feed.xml"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
              >
                <option value="industry">Industry News</option>
                <option value="regulations">Regulations</option>
                <option value="general">General News</option>
              </select>
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !url.trim()}
              className="w-full px-4 py-2 bg-ls-green text-white font-medium rounded-lg hover:bg-ls-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Source
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Google Trends Tab Content
  const TrendsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Google Trends - Lawn Care</h2>
          <p className="text-sm text-gray-500">Trending searches related to lawn care and landscaping</p>
        </div>
        <button
          onClick={fetchTrendsData}
          disabled={isLoadingTrends}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={isLoadingTrends ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoadingTrends && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-ls-green" />
        </div>
      )}

      {trendsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {trendsError}
        </div>
      )}

      {!isLoadingTrends && !trendsError && trendsData.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No trends data available.</p>
          <p className="text-sm text-gray-400 mt-1">Click Refresh to fetch latest trends.</p>
        </div>
      )}

      {!isLoadingTrends && trendsData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendsData.map((trend, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{trend.term}</h3>
                  <TrendIndicator rising={trend.rising} interest={trend.interest} />
                </div>
                <button
                  onClick={() => saveFromTrend(trend)}
                  className="p-2 text-gray-400 hover:text-ls-green hover:bg-ls-green-lighter rounded-lg transition-colors"
                  title="Save to My Topics"
                >
                  <BookmarkPlus size={18} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${trend.rising ? 'bg-green-500' : 'bg-ls-green'}`}
                    style={{ width: `${trend.interest}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{trend.interest}%</span>
              </div>

              {trend.relatedQueries && trend.relatedQueries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {trend.relatedQueries.slice(0, 3).map((query, qIdx) => (
                    <span key={qIdx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {query}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Industry News Tab Content
  const NewsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Industry News</h2>
          <p className="text-sm text-gray-500">
            Latest from lawn care industry sources
            {feedItems.lastFetched && (
              <span className="ml-2 text-gray-400">
                (Updated {formatRelativeTime(feedItems.lastFetched)})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddSourceModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus size={18} />
            Add Source
          </button>
          <button
            onClick={fetchRssFeeds}
            disabled={isLoadingFeeds}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoadingFeeds ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* RSS Sources */}
      <div className="bg-gray-50 rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">RSS Sources ({rssSources.length})</h3>
        <div className="flex flex-wrap gap-2">
          {rssSources.map((source) => (
            <div key={source.id} className="inline-flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
              <Rss size={14} className="text-ls-green" />
              <span className="text-sm text-gray-700">{source.name}</span>
              <button
                onClick={() => handleRemoveSource(source.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {isLoadingFeeds && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-ls-green" />
        </div>
      )}

      {feedError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {feedError}
        </div>
      )}

      {!isLoadingFeeds && feedItems.items?.length > 0 && (
        <div className="space-y-3">
          {feedItems.items.slice(0, 20).map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {item.source}
                    </span>
                    <span className="text-xs text-gray-500">{formatRelativeTime(item.pubDate)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Read Article"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => saveFromFeed(item)}
                    className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-lg text-gray-600 hover:text-ls-green hover:border-ls-green hover:bg-ls-green-lighter transition-colors"
                    title="Save to My Topics"
                  >
                    <BookmarkPlus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoadingFeeds && (!feedItems.items || feedItems.items.length === 0) && !feedError && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <Rss size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No feed items available.</p>
          <p className="text-sm text-gray-400 mt-1">Add RSS sources and click Refresh.</p>
        </div>
      )}
    </div>
  );

  // Seasonal Topics Tab Content
  const SeasonalTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Seasonal Topics</h2>
        <p className="text-sm text-gray-500">
          Lawn care topics that trend seasonally. Current season:{' '}
          <span className="font-medium text-ls-green capitalize">{currentSeason}</span>
        </p>
      </div>

      {/* Current Season Highlight */}
      <div className={`bg-gradient-to-r from-ls-green-lighter to-white rounded-xl border-2 border-ls-green p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-ls-green flex items-center justify-center">
            <SeasonIcon size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 capitalize">{currentSeason} Topics</h3>
            <p className="text-sm text-gray-600">Hot topics for the current season</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SEASONAL_TOPICS[currentSeason].topics.map((topic, idx) => (
            <div key={idx} className="bg-white rounded-lg border p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{topic.term}</h4>
                  <p className="text-xs text-gray-500 mt-1">{topic.description}</p>
                </div>
                <button
                  onClick={() => saveSeasonalTopic(topic, currentSeason)}
                  className="p-1.5 text-gray-400 hover:text-ls-green transition-colors"
                  title="Save to My Topics"
                >
                  <BookmarkPlus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other Seasons */}
      {Object.entries(SEASONAL_TOPICS)
        .filter(([season]) => season !== currentSeason)
        .map(([season, config]) => {
          const Icon = config.icon;
          const colorClasses = {
            green: 'border-green-200 bg-green-50',
            yellow: 'border-yellow-200 bg-yellow-50',
            orange: 'border-orange-200 bg-orange-50',
            blue: 'border-blue-200 bg-blue-50',
          };
          return (
            <div key={season} className={`rounded-xl border p-4 ${colorClasses[config.color]}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={20} className="text-gray-600" />
                <h3 className="font-semibold text-gray-800 capitalize">{season} Topics</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {config.topics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => saveSeasonalTopic(topic, season)}
                    className="text-left text-xs bg-white rounded px-2 py-1.5 border hover:border-ls-green hover:shadow-sm transition-all group"
                    title={topic.description}
                  >
                    <span className="text-gray-700 group-hover:text-ls-green">{topic.term}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );

  // My Topics Tab Content
  const MyTopicsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My Topics</h2>
          <p className="text-sm text-gray-500">Your saved topics and story ideas</p>
        </div>
        <button
          onClick={() => {
            setEditingTopic(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
        >
          <Plus size={18} />
          Add Topic
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-xl border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
            />
          </div>
          <select
            value={filterSeason}
            onChange={(e) => setFilterSeason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
          >
            <option value="all">All Seasons</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ls-green focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {topics.length > 0 && (
        <div className="text-sm text-gray-500">
          Showing {filteredTopics.length} of {topics.length} topics
        </div>
      )}

      {filteredTopics.length === 0 && topics.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <Tag size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No topics saved yet.</p>
          <p className="text-sm text-gray-400 mt-1">Save topics from Trends, News, or add manually.</p>
        </div>
      )}

      {filteredTopics.length === 0 && topics.length > 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border">
          <Search size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No topics match your filters.</p>
        </div>
      )}

      {filteredTopics.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Topic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Season</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Added</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTopics.map((topic) => (
                <tr key={topic.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{topic.title}</span>
                      {topic.source && (
                        <span className="text-xs text-gray-500 ml-2">({topic.source})</span>
                      )}
                      {topic.notes && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{topic.notes}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={topic.type} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={topic.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <SeasonBadge season={topic.season} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatRelativeTime(topic.dateAdded)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {topic.url && (
                        <a
                          href={topic.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Open Link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setEditingTopic(topic);
                          setShowAddModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'trends':
        return <TrendsTab />;
      case 'news':
        return <NewsTab />;
      case 'seasonal':
        return <SeasonalTab />;
      case 'my-topics':
        return <MyTopicsTab />;
      default:
        return <TrendsTab />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trending Topics</h1>
          <p className="text-sm text-gray-500">
            Track lawn care industry news, trends, and seasonal topics
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTopic(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-ls-green text-white rounded-lg hover:bg-ls-green-light transition-colors"
        >
          <Plus size={18} />
          Add Topic
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ls-green-lighter flex items-center justify-center">
              <Tag size={20} className="text-ls-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quickStats.totalTopics}</p>
              <p className="text-xs text-gray-500">Saved Topics</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <SeasonIcon size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quickStats.seasonalCount}</p>
              <p className="text-xs text-gray-500">This Season</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Flame size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quickStats.highPriorityCount}</p>
              <p className="text-xs text-gray-500">High Priority</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Rss size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quickStats.recentNewsCount}</p>
              <p className="text-xs text-gray-500">Recent News</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{quickStats.trendingCount}</p>
              <p className="text-xs text-gray-500">Trending Now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'trends', label: 'Google Trends', icon: TrendingUp },
            { id: 'news', label: 'Industry News', icon: Rss },
            { id: 'seasonal', label: 'Seasonal Topics', icon: Calendar },
            { id: 'my-topics', label: 'My Topics', icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-ls-green text-ls-green font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {tab.id === 'my-topics' && topics.length > 0 && (
                  <span className="bg-ls-green-lighter text-ls-green text-xs font-medium px-2 py-0.5 rounded-full">
                    {topics.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
      <AddEditModal />
      <AddSourceModal />
    </div>
  );
}
