// Scoring rubric for the Story & Pitch Analysis tab.
//
// Every metric is converted to a 0-100 sub-score by interpolating between the
// anchor points below, then the sub-scores are combined using the weights.
// Blank metrics are N/A: they are left out and the remaining weights are
// re-scaled, so a story is never penalised for data we don't have.
//
// To tune the rubric, edit weights and anchors here; nothing else needs to change.
//
// Anchors are [metric value, sub-score] pairs, sorted by value. Values between
// anchors are interpolated; values outside the range clamp to the first/last
// sub-score. For "lower is better" metrics (position) the sub-scores descend.

export const SCORING_METRICS = [
  // --- Core metrics (higher weight) ---
  {
    key: 'links',
    label: 'Backlinks',
    group: 'core',
    weight: 24,
    anchors: [[0, 0], [25, 35], [80, 75], [200, 100]],
    format: (v) => String(Math.round(v)),
  },
  {
    key: 'position',
    label: 'Avg position',
    group: 'core',
    weight: 15,
    anchors: [[1, 100], [3, 90], [10, 60], [20, 30], [50, 0]],
    format: (v) => v.toFixed(1),
  },
  {
    key: 'clickRate',
    label: 'National C/R',
    group: 'core',
    weight: 15,
    anchors: [[0, 0], [0.5, 30], [1.5, 70], [2.5, 100]],
    format: (v) => `${v.toFixed(2)}%`,
  },
  {
    key: 'da',
    label: 'Domain authority',
    group: 'core',
    weight: 11,
    anchors: [[0, 0], [40, 40], [60, 70], [80, 100]],
    format: (v) => v.toFixed(1),
  },
  {
    key: 'openRate',
    label: 'National O/R',
    group: 'core',
    weight: 7,
    anchors: [[0, 0], [15, 40], [20, 70], [25, 100]],
    format: (v) => `${v.toFixed(1)}%`,
  },
  // --- Search Console (28 days; shifts month to month, lower weight) ---
  {
    key: 'gscClicks',
    label: 'Search clicks (28d)',
    group: 'gsc',
    weight: 4,
    anchors: [[0, 0], [50, 40], [250, 75], [1000, 100]],
    format: (v) => Math.round(v).toLocaleString(),
  },
  {
    key: 'gscImpressions',
    label: 'Search impressions (28d)',
    group: 'gsc',
    weight: 3,
    anchors: [[0, 0], [1000, 40], [10000, 75], [50000, 100]],
    format: (v) => Math.round(v).toLocaleString(),
  },
  {
    key: 'impressions12mo',
    label: 'Search impressions (12 mo)',
    group: 'gsc',
    weight: 6,
    anchors: [[0, 0], [10000, 40], [100000, 75], [500000, 100]],
    format: (v) => Math.round(v).toLocaleString(),
  },
  {
    key: 'gscCtr',
    label: 'Search CTR (28d)',
    group: 'gsc',
    weight: 3,
    anchors: [[0, 0], [2, 30], [5, 60], [10, 100]],
    format: (v) => `${v.toFixed(2)}%`,
  },
  {
    key: 'impressionsChange',
    label: 'Impressions YoY',
    group: 'gsc',
    weight: 3,
    anchors: [[-50, 0], [0, 50], [50, 100]],
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
  },
  // --- GA4 (28 days; shifts month to month, lower weight) ---
  {
    key: 'pageViews',
    label: 'Page views (28d)',
    group: 'ga4',
    weight: 2,
    anchors: [[0, 0], [100, 40], [500, 75], [2000, 100]],
    format: (v) => Math.round(v).toLocaleString(),
  },
  {
    key: 'engagementTime',
    label: 'Avg engagement time (28d)',
    group: 'ga4',
    weight: 4,
    anchors: [[0, 0], [30, 40], [90, 75], [180, 100]],
    format: (v) => `${Math.round(v)}s`,
  },
  {
    key: 'scrollDepth',
    label: 'Scroll depth (28d)',
    group: 'ga4',
    weight: 3,
    anchors: [[0, 0], [20, 40], [50, 75], [80, 100]],
    format: (v) => `${v.toFixed(0)}%`,
  },
];

// Parse "18.90%", "1,174", " 7.0 " etc. Returns null for blank or non-numeric values.
export const parseMetricNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[%,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

// Find the DA value on a sheet row. Accepts headers like "DA", "Avg DA",
// "Average DA" or "Domain Authority" (parsed into snake_case keys).
export const getSheetDA = (item) => {
  const key = Object.keys(item).find(k => /^(avg_|average_)?(da|domain_authority)_?$/.test(k));
  return key ? parseMetricNumber(item[key]) : null;
};

const interpolate = (anchors, value) => {
  if (value <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (value >= x0 && value <= x1) {
      return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return last[1];
};

// Pull the raw metric values for a story. `item` is the sheet row, `cached` the
// Search Console / GA4 values we've fetched for it. Missing values are null.
export const collectStoryValues = (item, cached = {}) => {
  const linksRaw = parseMetricNumber(item['study_link_']);
  return {
    links: linksRaw,
    position: cached.avgPosition > 0 ? cached.avgPosition : null,
    clickRate: parseMetricNumber(item.national_c_r),
    da: getSheetDA(item),
    openRate: parseMetricNumber(item.national_o_r),
    gscClicks: parseMetricNumber(cached.clicks),
    gscImpressions: parseMetricNumber(cached.impressions),
    impressions12mo: parseMetricNumber(cached.impressions12mo),
    // Search Console returns CTR as a fraction
    gscCtr: cached.ctr === null || cached.ctr === undefined ? null : cached.ctr * 100,
    impressionsChange: parseMetricNumber(cached.impressionsChange),
    pageViews: parseMetricNumber(cached.pageViews),
    engagementTime: parseMetricNumber(cached.avgEngagementTime),
    scrollDepth: parseMetricNumber(cached.scrollDepth),
  };
};

// Score a story. Returns { score, coverage, breakdown } where score is 0-100 or
// null when no metric is available.
export const scoreStory = (item, cached = {}) => {
  const values = collectStoryValues(item, cached);

  const breakdown = SCORING_METRICS.map(metric => {
    const value = values[metric.key];
    const available = value !== null && value !== undefined;
    return {
      key: metric.key,
      label: metric.label,
      group: metric.group,
      weight: metric.weight,
      value,
      display: available ? metric.format(value) : 'N/A',
      subScore: available ? interpolate(metric.anchors, value) : null,
      available,
    };
  });

  const available = breakdown.filter(b => b.available);
  const availableWeight = available.reduce((sum, b) => sum + b.weight, 0);
  const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);

  const score = availableWeight > 0
    ? available.reduce((sum, b) => sum + b.subScore * b.weight, 0) / availableWeight
    : null;

  return {
    score,
    // Share of the rubric's weight backed by real data (0-1)
    coverage: totalWeight > 0 ? availableWeight / totalWeight : 0,
    availableCount: available.length,
    totalCount: breakdown.length,
    breakdown,
  };
};

export const formatScore = (score) => (score === null || score === undefined ? 'N/A' : score.toFixed(0));

// Awards shown next to a story's title. Each metric has its own emoji so the
// legend and the table line up. Thresholds match the rubric's upper anchors.
export const AWARDS = [
  { key: 'links', emoji: '🔥', legend: '80+ links', label: '80+ links', earned: (v) => v.links >= 80 },
  { key: 'openRate', emoji: '📬', legend: 'O/R 20%+', label: 'Open rate 20%+', earned: (v) => v.openRate >= 20 },
  { key: 'clickRate', emoji: '🎯', legend: 'C/R 1.5%+', label: 'Click rate 1.5%+', earned: (v) => v.clickRate >= 1.5 },
  {
    key: 'impressions',
    emoji: '🚀',
    legend: 'Impressions 10K+ (28d) or 100K+ (12 mo)',
    label: 'High impressions (10K+ in 28 days or 100K+ in 12 months)',
    earned: (v) => v.gscImpressions >= 10000 || v.impressions12mo >= 100000,
  },
];

// Awards a story has earned. Blank (null) metrics never earn an award.
export const getAwards = (item, cached = {}) => {
  const values = collectStoryValues(item, cached);
  return AWARDS.filter(award => award.earned(values));
};
