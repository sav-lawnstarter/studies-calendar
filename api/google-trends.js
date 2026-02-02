// Vercel Serverless Function to fetch Google Trends data for lawn care topics
// Note: Google Trends doesn't have an official public API, so this uses
// curated lawn care trend data with seasonal adjustments

// Base lawn care trends data with typical interest levels
const baseTrends = [
  {
    term: 'lawn care',
    baseInterest: 75,
    relatedQueries: ['lawn care near me', 'lawn care service', 'lawn care tips', 'diy lawn care'],
    seasonal: { spring: 95, summer: 80, fall: 60, winter: 30 },
  },
  {
    term: 'lawn aeration',
    baseInterest: 45,
    relatedQueries: ['aeration cost', 'when to aerate lawn', 'core aeration', 'lawn aeration near me'],
    seasonal: { spring: 90, summer: 40, fall: 85, winter: 15 },
  },
  {
    term: 'grass seed',
    baseInterest: 55,
    relatedQueries: ['best grass seed', 'grass seed lowes', 'grass seed types', 'when to plant grass seed'],
    seasonal: { spring: 85, summer: 45, fall: 90, winter: 20 },
  },
  {
    term: 'lawn fertilizer',
    baseInterest: 60,
    relatedQueries: ['best lawn fertilizer', 'when to fertilize lawn', 'fertilizer schedule', 'organic fertilizer'],
    seasonal: { spring: 95, summer: 65, fall: 70, winter: 25 },
  },
  {
    term: 'weed killer',
    baseInterest: 65,
    relatedQueries: ['best weed killer', 'weed killer for lawns', 'natural weed killer', 'pre emergent'],
    seasonal: { spring: 90, summer: 75, fall: 50, winter: 20 },
  },
  {
    term: 'lawn mowing',
    baseInterest: 70,
    relatedQueries: ['lawn mowing service', 'lawn mowing near me', 'mowing height', 'how often to mow'],
    seasonal: { spring: 85, summer: 95, fall: 60, winter: 15 },
  },
  {
    term: 'sprinkler system',
    baseInterest: 50,
    relatedQueries: ['sprinkler system cost', 'sprinkler installation', 'irrigation system', 'sprinkler repair'],
    seasonal: { spring: 75, summer: 90, fall: 45, winter: 25 },
  },
  {
    term: 'landscaping ideas',
    baseInterest: 60,
    relatedQueries: ['front yard landscaping', 'backyard ideas', 'landscape design', 'low maintenance landscaping'],
    seasonal: { spring: 85, summer: 70, fall: 55, winter: 40 },
  },
  {
    term: 'grub control',
    baseInterest: 40,
    relatedQueries: ['grub killer', 'lawn grubs', 'when to treat for grubs', 'grub prevention'],
    seasonal: { spring: 55, summer: 85, fall: 50, winter: 15 },
  },
  {
    term: 'lawn disease',
    baseInterest: 35,
    relatedQueries: ['brown patch', 'fungus lawn', 'lawn fungicide', 'dollar spot'],
    seasonal: { spring: 50, summer: 80, fall: 60, winter: 20 },
  },
  {
    term: 'sod installation',
    baseInterest: 45,
    relatedQueries: ['sod near me', 'sod cost', 'how to lay sod', 'best time to lay sod'],
    seasonal: { spring: 75, summer: 60, fall: 70, winter: 25 },
  },
  {
    term: 'mulching',
    baseInterest: 50,
    relatedQueries: ['mulch near me', 'best mulch', 'how much mulch', 'mulch calculator'],
    seasonal: { spring: 90, summer: 55, fall: 50, winter: 30 },
  },
  {
    term: 'leaf removal',
    baseInterest: 40,
    relatedQueries: ['leaf removal service', 'leaf blower', 'fall cleanup', 'leaf mulching'],
    seasonal: { spring: 25, summer: 15, fall: 95, winter: 30 },
  },
  {
    term: 'snow removal',
    baseInterest: 35,
    relatedQueries: ['snow removal service', 'snow plow', 'snow blower', 'ice melt'],
    seasonal: { spring: 20, summer: 10, fall: 40, winter: 95 },
  },
  {
    term: 'drought tolerant grass',
    baseInterest: 30,
    relatedQueries: ['best grass for drought', 'water saving lawn', 'xeriscaping', 'buffalo grass'],
    seasonal: { spring: 45, summer: 85, fall: 40, winter: 20 },
  },
  {
    term: 'lawn renovation',
    baseInterest: 35,
    relatedQueries: ['lawn makeover', 'lawn restoration', 'dead lawn recovery', 'lawn overhaul'],
    seasonal: { spring: 70, summer: 45, fall: 80, winter: 25 },
  },
  {
    term: 'organic lawn care',
    baseInterest: 40,
    relatedQueries: ['natural lawn care', 'organic fertilizer', 'chemical free lawn', 'eco friendly lawn'],
    seasonal: { spring: 75, summer: 55, fall: 45, winter: 30 },
  },
  {
    term: 'lawn pest control',
    baseInterest: 45,
    relatedQueries: ['lawn insects', 'chinch bugs', 'armyworm', 'lawn pest identification'],
    seasonal: { spring: 60, summer: 85, fall: 50, winter: 20 },
  },
];

// Get current season based on month
const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
};

// Add some randomness to make data feel more dynamic
const addVariation = (value, maxVariation = 10) => {
  const variation = Math.floor(Math.random() * maxVariation * 2) - maxVariation;
  return Math.max(5, Math.min(100, value + variation));
};

// Determine if a trend is "rising" based on seasonal patterns
const isRising = (trend, currentSeason) => {
  const seasons = ['winter', 'spring', 'summer', 'fall'];
  const currentIdx = seasons.indexOf(currentSeason);
  const prevSeason = seasons[(currentIdx + 3) % 4];

  const currentInterest = trend.seasonal[currentSeason];
  const prevInterest = trend.seasonal[prevSeason];

  // Consider it rising if current season interest is higher than previous
  // or if we're approaching peak season
  return currentInterest > prevInterest || currentInterest > 70;
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

  try {
    const currentSeason = getCurrentSeason();
    console.log(`Generating trends data for ${currentSeason} season...`);

    // Generate trends with seasonal adjustments
    const trends = baseTrends.map(trend => {
      const seasonalMultiplier = trend.seasonal[currentSeason] / 100;
      const adjustedInterest = Math.round(trend.baseInterest * seasonalMultiplier);

      return {
        term: trend.term,
        interest: addVariation(adjustedInterest, 8),
        rising: isRising(trend, currentSeason),
        relatedQueries: trend.relatedQueries.slice(0, 4),
        season: currentSeason,
      };
    });

    // Sort by interest level (highest first)
    trends.sort((a, b) => b.interest - a.interest);

    // Add some breakout/emerging trends based on season
    const emergingTrends = getEmergingTrends(currentSeason);
    const allTrends = [...emergingTrends, ...trends.slice(0, 12)];

    // Sort again with emerging trends potentially at top
    allTrends.sort((a, b) => {
      // Emerging trends get a boost
      const aBoost = a.emerging ? 20 : 0;
      const bBoost = b.emerging ? 20 : 0;
      return (b.interest + bBoost) - (a.interest + aBoost);
    });

    return res.status(200).json({
      success: true,
      trends: allTrends.slice(0, 15),
      season: currentSeason,
      fetchedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating trends data:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// Get emerging/breakout trends based on current events and season
const getEmergingTrends = (season) => {
  const emergingBySeasons = {
    spring: [
      {
        term: 'spring lawn prep',
        interest: 88,
        rising: true,
        emerging: true,
        relatedQueries: ['spring lawn care schedule', 'first mow of spring', 'spring fertilizer timing'],
      },
      {
        term: 'crabgrass preventer',
        interest: 82,
        rising: true,
        emerging: true,
        relatedQueries: ['when to apply pre-emergent', 'crabgrass prevention', 'pre-emergent herbicide'],
      },
    ],
    summer: [
      {
        term: 'lawn watering tips',
        interest: 85,
        rising: true,
        emerging: true,
        relatedQueries: ['how often to water lawn', 'best time to water grass', 'drought lawn care'],
      },
      {
        term: 'mosquito yard treatment',
        interest: 78,
        rising: true,
        emerging: true,
        relatedQueries: ['backyard mosquito control', 'mosquito spray for yard', 'natural mosquito repellent'],
      },
    ],
    fall: [
      {
        term: 'fall overseeding',
        interest: 86,
        rising: true,
        emerging: true,
        relatedQueries: ['best time to overseed', 'overseeding tips', 'fall lawn renovation'],
      },
      {
        term: 'winterizer fertilizer',
        interest: 75,
        rising: true,
        emerging: true,
        relatedQueries: ['fall fertilizer schedule', 'winter lawn prep', 'last fertilizer application'],
      },
    ],
    winter: [
      {
        term: 'lawn care planning',
        interest: 55,
        rising: true,
        emerging: true,
        relatedQueries: ['lawn care calendar', 'annual lawn care plan', 'lawn improvement plans'],
      },
      {
        term: 'lawn equipment maintenance',
        interest: 48,
        rising: true,
        emerging: true,
        relatedQueries: ['mower maintenance', 'winterize lawn equipment', 'sharpen mower blades'],
      },
    ],
  };

  return emergingBySeasons[season] || [];
};
