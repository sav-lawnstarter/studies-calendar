// Pre-loaded events data for the editorial calendar
// Includes holidays, sports events, awards shows, and high traffic media days

export const preloadedEvents = [
  // January 2025 Events
  { id: 'evt-1', title: 'New Year\'s Day', date: '2025-01-01', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-2', title: 'NFL Wild Card Weekend', date: '2025-01-11', endDate: '2025-01-13', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-3', title: 'Golden Globes', date: '2025-01-05', type: 'highTraffic', category: 'Awards' },
  { id: 'evt-4', title: 'NFL Divisional Playoffs', date: '2025-01-18', endDate: '2025-01-19', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-5', title: 'Martin Luther King Jr. Day', date: '2025-01-20', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-6', title: 'NFL Conference Championships', date: '2025-01-26', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-7', title: 'Grammy Awards', date: '2025-02-02', type: 'highTraffic', category: 'Awards' },

  // February 2025 Events
  { id: 'evt-8', title: 'Groundhog Day', date: '2025-02-02', type: 'holiday', category: 'Observance' },
  { id: 'evt-9', title: 'Super Bowl LIX', date: '2025-02-09', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-10', title: 'Valentine\'s Day', date: '2025-02-14', type: 'holiday', category: 'Observance' },
  { id: 'evt-11', title: 'Presidents\' Day', date: '2025-02-17', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-12', title: 'NBA All-Star Weekend', date: '2025-02-14', endDate: '2025-02-16', type: 'highTraffic', category: 'Sports' },

  // March 2025 Events
  { id: 'evt-13', title: 'Oscars / Academy Awards', date: '2025-03-02', type: 'highTraffic', category: 'Awards' },
  { id: 'evt-14', title: 'Daylight Saving Time Begins', date: '2025-03-09', type: 'holiday', category: 'Observance' },
  { id: 'evt-15', title: 'St. Patrick\'s Day', date: '2025-03-17', type: 'holiday', category: 'Observance' },
  { id: 'evt-16', title: 'NCAA March Madness Begins', date: '2025-03-18', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-17', title: 'First Day of Spring', date: '2025-03-20', type: 'holiday', category: 'Season' },

  // April 2025 Events
  { id: 'evt-18', title: 'April Fools\' Day', date: '2025-04-01', type: 'holiday', category: 'Observance' },
  { id: 'evt-19', title: 'NCAA Final Four', date: '2025-04-05', endDate: '2025-04-07', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-20', title: 'Masters Tournament', date: '2025-04-10', endDate: '2025-04-13', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-21', title: 'Easter Sunday', date: '2025-04-20', type: 'holiday', category: 'Religious Holiday' },
  { id: 'evt-22', title: 'Earth Day', date: '2025-04-22', type: 'holiday', category: 'Observance' },
  { id: 'evt-23', title: 'NFL Draft', date: '2025-04-24', endDate: '2025-04-26', type: 'highTraffic', category: 'Sports' },

  // May 2025 Events
  { id: 'evt-24', title: 'Kentucky Derby', date: '2025-05-03', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-25', title: 'Cinco de Mayo', date: '2025-05-05', type: 'holiday', category: 'Observance' },
  { id: 'evt-26', title: 'Mother\'s Day', date: '2025-05-11', type: 'holiday', category: 'Observance' },
  { id: 'evt-27', title: 'Memorial Day', date: '2025-05-26', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-28', title: 'Indianapolis 500', date: '2025-05-25', type: 'highTraffic', category: 'Sports' },

  // June 2025 Events
  { id: 'evt-29', title: 'NBA Finals', date: '2025-06-05', endDate: '2025-06-22', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-30', title: 'Flag Day', date: '2025-06-14', type: 'holiday', category: 'Observance' },
  { id: 'evt-31', title: 'Father\'s Day', date: '2025-06-15', type: 'holiday', category: 'Observance' },
  { id: 'evt-32', title: 'Juneteenth', date: '2025-06-19', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-33', title: 'First Day of Summer', date: '2025-06-20', type: 'holiday', category: 'Season' },
  { id: 'evt-34', title: 'U.S. Open (Golf)', date: '2025-06-12', endDate: '2025-06-15', type: 'highTraffic', category: 'Sports' },

  // July 2025 Events
  { id: 'evt-35', title: 'Independence Day', date: '2025-07-04', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-36', title: 'MLB All-Star Game', date: '2025-07-15', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-37', title: 'The Open Championship', date: '2025-07-17', endDate: '2025-07-20', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-38', title: 'Comic-Con International', date: '2025-07-24', endDate: '2025-07-27', type: 'highTraffic', category: 'Entertainment' },

  // August 2025 Events
  { id: 'evt-39', title: 'NFL Preseason Begins', date: '2025-08-01', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-40', title: 'PGA Championship', date: '2025-08-14', endDate: '2025-08-17', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-41', title: 'MTV Video Music Awards', date: '2025-08-24', type: 'highTraffic', category: 'Awards' },

  // September 2025 Events
  { id: 'evt-42', title: 'Labor Day', date: '2025-09-01', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-43', title: 'NFL Regular Season Begins', date: '2025-09-04', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-44', title: 'Emmy Awards', date: '2025-09-21', type: 'highTraffic', category: 'Awards' },
  { id: 'evt-45', title: 'First Day of Fall', date: '2025-09-22', type: 'holiday', category: 'Season' },

  // October 2025 Events
  { id: 'evt-46', title: 'MLB Playoffs Begin', date: '2025-10-01', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-47', title: 'Columbus Day / Indigenous Peoples\' Day', date: '2025-10-13', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-48', title: 'World Series', date: '2025-10-24', endDate: '2025-11-01', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-49', title: 'Halloween', date: '2025-10-31', type: 'holiday', category: 'Observance' },

  // November 2025 Events
  { id: 'evt-50', title: 'Daylight Saving Time Ends', date: '2025-11-02', type: 'holiday', category: 'Observance' },
  { id: 'evt-51', title: 'Election Day', date: '2025-11-04', type: 'holiday', category: 'Civic' },
  { id: 'evt-52', title: 'Veterans Day', date: '2025-11-11', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-53', title: 'Thanksgiving Day', date: '2025-11-27', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-54', title: 'Black Friday', date: '2025-11-28', type: 'highTraffic', category: 'Shopping' },
  { id: 'evt-55', title: 'Cyber Monday', date: '2025-12-01', type: 'highTraffic', category: 'Shopping' },

  // December 2025 Events
  { id: 'evt-56', title: 'First Day of Winter', date: '2025-12-21', type: 'holiday', category: 'Season' },
  { id: 'evt-57', title: 'Christmas Eve', date: '2025-12-24', type: 'holiday', category: 'Religious Holiday' },
  { id: 'evt-58', title: 'Christmas Day', date: '2025-12-25', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-59', title: 'New Year\'s Eve', date: '2025-12-31', type: 'holiday', category: 'Observance' },
  { id: 'evt-60', title: 'College Football Playoffs', date: '2025-12-20', endDate: '2026-01-20', type: 'highTraffic', category: 'Sports' },

  // January 2026 Events
  { id: 'evt-61', title: 'New Year\'s Day', date: '2026-01-01', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-62', title: 'NFL Wild Card Weekend', date: '2026-01-10', endDate: '2026-01-12', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-63', title: 'Golden Globes', date: '2026-01-04', type: 'highTraffic', category: 'Awards' },
  { id: 'evt-64', title: 'NFL Divisional Playoffs', date: '2026-01-17', endDate: '2026-01-18', type: 'highTraffic', category: 'Sports' },
  { id: 'evt-65', title: 'Martin Luther King Jr. Day', date: '2026-01-19', type: 'holiday', category: 'Federal Holiday' },
  { id: 'evt-66', title: 'NFL Conference Championships', date: '2026-01-25', type: 'highTraffic', category: 'Sports' },
];

// Sample stories data
export const sampleStories = [
  {
    id: 'story-1',
    title: 'Best Lawn Care Tips for Spring 2025',
    status: 'In Progress',
    assignee: 'Sarah Johnson',
    dueDate: '2025-03-15',
    publishDate: '2025-03-20',
    type: 'story',
    priority: 'High',
    urls: {
      draft: 'https://docs.google.com/document/d/abc123',
      published: '',
    },
    notes: 'Focus on early spring preparation. Include regional variations.',
    metrics: {
      targetWords: 2500,
      currentWords: 1800,
    },
    milestones: [
      { name: 'Research Complete', date: '2025-03-01', completed: true },
      { name: 'First Draft', date: '2025-03-10', completed: true },
      { name: 'Editorial Review', date: '2025-03-12', completed: false },
      { name: 'Final Edits', date: '2025-03-15', completed: false },
      { name: 'Publish', date: '2025-03-20', completed: false },
    ],
  },
  {
    id: 'story-2',
    title: 'Super Bowl Party Lawn Games Guide',
    status: 'Published',
    assignee: 'Mike Chen',
    dueDate: '2025-02-01',
    publishDate: '2025-02-05',
    type: 'story',
    priority: 'Medium',
    urls: {
      draft: 'https://docs.google.com/document/d/def456',
      published: 'https://lawnstarter.com/blog/super-bowl-lawn-games',
    },
    notes: 'Tie into Super Bowl weekend. Include product recommendations.',
    metrics: {
      targetWords: 1500,
      currentWords: 1650,
      pageViews: 12500,
      avgTimeOnPage: '4:32',
    },
    milestones: [
      { name: 'Research Complete', date: '2025-01-20', completed: true },
      { name: 'First Draft', date: '2025-01-25', completed: true },
      { name: 'Editorial Review', date: '2025-01-28', completed: true },
      { name: 'Final Edits', date: '2025-02-01', completed: true },
      { name: 'Publish', date: '2025-02-05', completed: true },
    ],
  },
  {
    id: 'story-3',
    title: 'Easter Garden Decoration Ideas',
    status: 'Draft',
    assignee: 'Emily Rodriguez',
    dueDate: '2025-04-10',
    publishDate: '2025-04-15',
    type: 'story',
    priority: 'Medium',
    urls: {
      draft: 'https://docs.google.com/document/d/ghi789',
      published: '',
    },
    notes: 'Family-friendly content. Include DIY projects.',
    metrics: {
      targetWords: 2000,
      currentWords: 500,
    },
    milestones: [
      { name: 'Research Complete', date: '2025-03-25', completed: true },
      { name: 'First Draft', date: '2025-04-01', completed: false },
      { name: 'Editorial Review', date: '2025-04-05', completed: false },
      { name: 'Final Edits', date: '2025-04-10', completed: false },
      { name: 'Publish', date: '2025-04-15', completed: false },
    ],
  },
  {
    id: 'story-4',
    title: 'Summer Lawn Maintenance Schedule',
    status: 'Planned',
    assignee: 'David Park',
    dueDate: '2025-05-20',
    publishDate: '2025-05-25',
    type: 'story',
    priority: 'High',
    urls: {
      draft: '',
      published: '',
    },
    notes: 'Comprehensive guide for summer care. High SEO potential.',
    metrics: {
      targetWords: 3000,
      currentWords: 0,
    },
    milestones: [
      { name: 'Research Complete', date: '2025-05-01', completed: false },
      { name: 'First Draft', date: '2025-05-10', completed: false },
      { name: 'Editorial Review', date: '2025-05-15', completed: false },
      { name: 'Final Edits', date: '2025-05-20', completed: false },
      { name: 'Publish', date: '2025-05-25', completed: false },
    ],
  },
  {
    id: 'story-5',
    title: 'Fall Leaf Cleanup Best Practices',
    status: 'Planned',
    assignee: 'Sarah Johnson',
    dueDate: '2025-09-15',
    publishDate: '2025-09-20',
    type: 'story',
    priority: 'Low',
    urls: {
      draft: '',
      published: '',
    },
    notes: 'Update from last year\'s guide with new equipment reviews.',
    metrics: {
      targetWords: 2200,
      currentWords: 0,
    },
    milestones: [
      { name: 'Research Complete', date: '2025-09-01', completed: false },
      { name: 'First Draft', date: '2025-09-08', completed: false },
      { name: 'Editorial Review', date: '2025-09-12', completed: false },
      { name: 'Final Edits', date: '2025-09-15', completed: false },
      { name: 'Publish', date: '2025-09-20', completed: false },
    ],
  },
];

// Sample team OOO data
export const sampleOOO = [
  { id: 'ooo-1', title: 'Sarah Johnson - PTO', date: '2025-03-24', endDate: '2025-03-28', type: 'ooo', person: 'Sarah Johnson' },
  { id: 'ooo-2', title: 'Mike Chen - Conference', date: '2025-04-15', endDate: '2025-04-17', type: 'ooo', person: 'Mike Chen' },
  { id: 'ooo-3', title: 'Emily Rodriguez - Sick', date: '2025-02-10', type: 'ooo', person: 'Emily Rodriguez' },
  { id: 'ooo-4', title: 'David Park - Vacation', date: '2025-06-01', endDate: '2025-06-14', type: 'ooo', person: 'David Park' },
  { id: 'ooo-5', title: 'Team Holiday - Memorial Day', date: '2025-05-26', type: 'ooo', person: 'Team' },
];

// Sample blocked dates
export const sampleBlockedDates = [
  { id: 'block-1', title: 'Content Freeze - Q1 Close', date: '2025-03-28', endDate: '2025-03-31', type: 'blocked', reason: 'Quarter-end metrics review' },
  { id: 'block-2', title: 'Site Maintenance', date: '2025-04-05', type: 'blocked', reason: 'Scheduled server maintenance' },
  { id: 'block-3', title: 'Content Freeze - Q2 Close', date: '2025-06-27', endDate: '2025-06-30', type: 'blocked', reason: 'Quarter-end metrics review' },
  { id: 'block-4', title: 'Holiday Publishing Pause', date: '2025-12-24', endDate: '2025-12-26', type: 'blocked', reason: 'Holiday break' },
];

// Team members data
export const teamMembers = [
  { id: 'tm-1', name: 'Sarah Johnson', role: 'Senior Content Editor', email: 'sarah.johnson@lawnstarter.com', avatar: 'SJ' },
  { id: 'tm-2', name: 'Mike Chen', role: 'Content Writer', email: 'mike.chen@lawnstarter.com', avatar: 'MC' },
  { id: 'tm-3', name: 'Emily Rodriguez', role: 'Content Writer', email: 'emily.rodriguez@lawnstarter.com', avatar: 'ER' },
  { id: 'tm-4', name: 'David Park', role: 'SEO Specialist', email: 'david.park@lawnstarter.com', avatar: 'DP' },
  { id: 'tm-5', name: 'Lisa Thompson', role: 'Content Manager', email: 'lisa.thompson@lawnstarter.com', avatar: 'LT' },
];

// Competitor activity log
export const competitorLog = [
  { id: 'comp-1', date: '2025-01-15', competitor: 'TruGreen', activity: 'Published comprehensive spring lawn guide', url: 'https://trugreen.com/blog/spring-guide', notes: 'Similar to our planned Q1 content' },
  { id: 'comp-2', date: '2025-01-20', competitor: 'Scotts', activity: 'Launched new video tutorial series', url: 'https://scotts.com/videos', notes: 'High production value, lawn care basics' },
  { id: 'comp-3', date: '2025-02-01', competitor: 'Sunday Lawn Care', activity: 'Super Bowl regional ad campaign', url: '', notes: 'Focus on eco-friendly products' },
  { id: 'comp-4', date: '2025-02-10', competitor: 'TruGreen', activity: 'Social media campaign #GreenLawn2025', url: 'https://twitter.com/trugreen', notes: 'User-generated content focus' },
];
