// 2026 High-Traffic Media Events
// These are major media days - busy but not necessarily blocked

export const highTrafficEvents2026 = [
  // Awards Season
  { date: '2026-01-11', name: 'Golden Globes', category: 'Awards', type: 'high_traffic' },
  { date: '2026-01-22', name: 'Oscar Nominations', category: 'Awards', type: 'high_traffic' },
  { date: '2026-01-22', name: 'Sundance Film Festival (Start)', category: 'Awards', type: 'high_traffic' },
  { date: '2026-02-01', name: 'Sundance Film Festival (End)', category: 'Awards', type: 'high_traffic' },
  { date: '2026-02-01', name: 'Grammy Awards', category: 'Awards', type: 'high_traffic' },
  { date: '2026-02-22', name: 'BAFTAs', category: 'Awards', type: 'high_traffic' },
  { date: '2026-03-01', name: 'SAG Awards', category: 'Awards', type: 'high_traffic' },
  { date: '2026-03-15', name: 'Oscars', category: 'Awards', type: 'high_traffic' },
  { date: '2026-06-15', name: 'Tony Awards (TBD)', category: 'Awards', type: 'high_traffic' },
  { date: '2026-09-15', name: 'Emmy Awards (TBD)', category: 'Awards', type: 'high_traffic' },

  // Sports - NFL Playoffs (Weekends in January)
  { date: '2026-01-03', name: 'NFL Playoffs Weekend', category: 'Sports', type: 'high_traffic' },
  { date: '2026-01-04', name: 'NFL Playoffs Weekend', category: 'Sports', type: 'high_traffic' },
  { date: '2026-01-10', name: 'NFL Playoffs Weekend', category: 'Sports', type: 'high_traffic' },
  { date: '2026-01-11', name: 'NFL Playoffs Weekend', category: 'Sports', type: 'high_traffic' },
  { date: '2026-01-17', name: 'NFL Playoffs Weekend', category: 'Sports', type: 'high_traffic' },
  { date: '2026-01-18', name: 'NFL Playoffs Weekend', category: 'Sports', type: 'high_traffic' },
  { date: '2026-01-24', name: 'NFL Conference Championships', category: 'Sports', type: 'high_traffic' },
  { date: '2026-01-25', name: 'NFL Conference Championships', category: 'Sports', type: 'high_traffic' },

  // College Football Championship
  { date: '2026-01-19', name: 'College Football Championship', category: 'Sports', type: 'high_traffic' },

  // Super Bowl LX and day after (blocked)
  { date: '2026-02-08', name: 'Super Bowl LX', category: 'Sports', type: 'high_traffic' },
  { date: '2026-02-09', name: 'Day After Super Bowl', category: 'Sports', type: 'blocked' },

  // Winter Olympics
  ...generateDateRange('2026-02-06', '2026-02-22', 'Winter Olympics', 'Sports', 'high_traffic'),

  // World Baseball Classic
  ...generateDateRange('2026-03-05', '2026-03-17', 'World Baseball Classic', 'Sports', 'high_traffic'),

  // March Madness
  ...generateDateRange('2026-03-17', '2026-04-06', 'March Madness', 'Sports', 'high_traffic'),

  // The Masters
  ...generateDateRange('2026-04-09', '2026-04-12', 'The Masters', 'Sports', 'high_traffic'),

  // Kentucky Derby
  { date: '2026-05-02', name: 'Kentucky Derby', category: 'Sports', type: 'high_traffic' },

  // FIFA World Cup (US co-hosting)
  ...generateDateRange('2026-06-11', '2026-07-19', 'FIFA World Cup', 'Sports', 'high_traffic'),

  // US Open Golf
  ...generateDateRange('2026-06-18', '2026-06-21', 'US Open Golf', 'Sports', 'high_traffic'),

  // MLB All-Star Game
  { date: '2026-07-14', name: 'MLB All-Star Game', category: 'Sports', type: 'high_traffic' },

  // US Open Tennis (Late August - Early September)
  ...generateDateRange('2026-08-31', '2026-09-13', 'US Open Tennis', 'Sports', 'high_traffic'),

  // Political & Cultural
  { date: '2026-07-04', name: "America's 250th Birthday", category: 'Political', type: 'high_traffic' },
  { date: '2026-11-03', name: 'Midterm Election Day', category: 'Political', type: 'blocked' },
  { date: '2026-11-04', name: 'Day After Election', category: 'Political', type: 'blocked' },
];

// Helper function to generate date ranges
function generateDateRange(startDate, endDate, name, category, type) {
  const events = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    events.push({
      date: d.toISOString().split('T')[0],
      name: name,
      category: category,
      type: type
    });
  }

  return events;
}

// Export a function to get events by date
export function getEventsByDate(date) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return highTrafficEvents2026.filter(e => e.date === dateStr);
}

// Export a function to check if a date is blocked
export function isBlockedDate(date) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return highTrafficEvents2026.some(e => e.date === dateStr && e.type === 'blocked');
}

// Export a function to check if a date is high traffic
export function isHighTrafficDate(date) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return highTrafficEvents2026.some(e => e.date === dateStr && e.type === 'high_traffic');
}
