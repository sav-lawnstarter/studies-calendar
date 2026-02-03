// Google Sheets API utility for client-side OAuth
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets', // Full read/write access to Sheets
  'https://www.googleapis.com/auth/webmasters.readonly', // Search Console
  'https://www.googleapis.com/auth/analytics.readonly', // Google Analytics
  'https://www.googleapis.com/auth/calendar.readonly', // Google Calendar (for team OOO)
  'https://www.googleapis.com/auth/drive.file', // Google Drive (for creating new drafts from templates)
].join(' ');

// Study Story Data sheet (for Story & Pitch Analysis)
const STUDY_SPREADSHEET_ID = '1L8jwOxU_9lLetVOyuNmdov9p56b4ypbIFCjfjJAiZt8';
const STUDY_SHEET_NAME = 'Study Story Data';

// Content Calendar Planning sheet (for approved stories on calendar)
const CONTENT_CALENDAR_SPREADSHEET_ID = '1ELXVk6Zu9U3ISiv7zQM0rf9GCi_v2OrRzNat9cKGw7M';
const CONTENT_CALENDAR_SHEET_NAME = 'Content Calendar';

// Story Ideation tab (same spreadsheet as Content Calendar)
const STORY_IDEATION_SHEET_NAME = 'Story Ideation';

// Competitor Log tab (same spreadsheet as Content Calendar)
const COMPETITOR_LOG_SHEET_NAME = 'Competitor Log';

// Storage key for tokens
const TOKEN_STORAGE_KEY = 'google-sheets-token';

// Load Google Identity Services script
export const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Get stored token
export const getStoredToken = () => {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      const { token, expiry } = JSON.parse(stored);
      if (expiry > Date.now()) {
        return token;
      }
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error reading stored token:', e);
  }
  return null;
};

// Store token
const storeToken = (token, expiresIn) => {
  try {
    const expiry = Date.now() + (expiresIn * 1000) - 60000; // Subtract 1 minute for safety
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token, expiry }));
  } catch (e) {
    console.error('Error storing token:', e);
  }
};

// Initialize OAuth client and request access
export const authenticateWithGoogle = (clientId) => {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.'));
      return;
    }

    loadGoogleScript().then(() => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          storeToken(response.access_token, response.expires_in);
          resolve(response.access_token);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    }).catch(reject);
  });
};

// Fetch data from Study Story Data sheet (for Story & Pitch Analysis)
export const fetchSheetData = async (accessToken) => {
  const range = `${STUDY_SHEET_NAME}!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${STUDY_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
  }

  const data = await response.json();
  return parseSheetData(data.values);
};

// Fetch data from Content Calendar Planning sheet (for approved stories on calendar)
export const fetchContentCalendarData = async (accessToken) => {
  const range = `${CONTENT_CALENDAR_SHEET_NAME}!A:L`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to fetch Content Calendar data: ${response.statusText}`);
  }

  const data = await response.json();
  return parseContentCalendarData(data.values);
};

// Convert date from MM/DD/YYYY to YYYY-MM-DD format
const convertDateFormat = (dateStr) => {
  if (!dateStr) return '';

  // Check if it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle MM/DD/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Return original if no match (might be text or other format)
  return dateStr;
};

// Fields that should be treated as dates
// Note: 'pitch_date' is used by Content Calendar, 'date_pitched' is used by Study Story Data
const DATE_FIELDS = ['pitch_date', 'date_pitched', 'analysis_due_by', 'edits_due_by', 'qa_due_by', 'production_date'];

// Parse Content Calendar data into structured objects
const parseContentCalendarData = (values) => {
  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map((row, index) => {
    const item = { id: `content-calendar-${index}` };
    headers.forEach((header, colIndex) => {
      const key = header.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      let value = row[colIndex] || '';

      // Convert date fields to ISO format
      if (DATE_FIELDS.includes(key) && value) {
        value = convertDateFormat(value);
      }

      item[key] = value;
    });
    return item;
  });
};

// Parse sheet data into structured objects (Study Story Data)
const parseSheetData = (values) => {
  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map((row, index) => {
    const item = { id: index };
    headers.forEach((header, colIndex) => {
      const key = header.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      let value = row[colIndex] || '';

      // Convert date fields to ISO format for consistent matching
      if (DATE_FIELDS.includes(key) && value) {
        value = convertDateFormat(value);
      }

      item[key] = value;
    });
    return item;
  });
};

// Logout / clear stored token
export const clearGoogleAuth = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

// ============================================
// STORY IDEATION FUNCTIONS
// ============================================

// Story Ideation columns: A: Story Title, B: Brief Description, C: Potential Metrics/Data Sources,
// D: News Peg, E: Pitch Date, F: Date Added

// Fetch all Story Ideation entries
export const fetchStoryIdeationData = async (accessToken) => {
  const range = `${STORY_IDEATION_SHEET_NAME}!A:F`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to fetch Story Ideation data: ${response.statusText}`);
  }

  const data = await response.json();
  return parseStoryIdeationData(data.values);
};

// Parse Story Ideation data
const parseStoryIdeationData = (values) => {
  if (!values || values.length < 2) {
    return [];
  }

  // Skip header row, parse each data row
  return values.slice(1).map((row, index) => ({
    id: `story-ideation-sheet-${index}`,
    rowIndex: index + 2, // Sheet rows are 1-indexed, plus header row
    title: row[0] || '',
    description: row[1] || '',
    metrics: row[2] || '',
    newsPeg: row[3] || '',
    pitchDate: row[4] ? convertDateFormat(row[4]) : '',
    dateAdded: row[5] ? convertDateFormat(row[5]) : '',
  }));
};

// Append a new Story Ideation entry
export const appendStoryIdeation = async (accessToken, entry) => {
  const range = `${STORY_IDEATION_SHEET_NAME}!A:F`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  // Format date for sheet (MM/DD/YYYY)
  const formatDateForSheet = (dateStr) => {
    if (!dateStr) return '';
    // If already in MM/DD/YYYY format, return as is
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
    // Convert from YYYY-MM-DD to MM/DD/YYYY
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${parseInt(match[2])}/${parseInt(match[3])}/${match[1]}`;
    }
    return dateStr;
  };

  const values = [[
    entry.title || '',
    entry.description || '',
    entry.metrics || '',
    entry.newsPeg || '',
    formatDateForSheet(entry.pitchDate),
    formatDateForSheet(entry.dateAdded || new Date().toISOString().split('T')[0]),
  ]];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to add Story Ideation: ${response.statusText}`);
  }

  return response.json();
};

// Update a Story Ideation entry
export const updateStoryIdeation = async (accessToken, rowIndex, entry) => {
  const range = `${STORY_IDEATION_SHEET_NAME}!A${rowIndex}:F${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const formatDateForSheet = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${parseInt(match[2])}/${parseInt(match[3])}/${match[1]}`;
    }
    return dateStr;
  };

  const values = [[
    entry.title || '',
    entry.description || '',
    entry.metrics || '',
    entry.newsPeg || '',
    formatDateForSheet(entry.pitchDate),
    formatDateForSheet(entry.dateAdded),
  ]];

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to update Story Ideation: ${response.statusText}`);
  }

  return response.json();
};

// Delete a Story Ideation entry (clear the row)
export const deleteStoryIdeation = async (accessToken, rowIndex) => {
  // Use batchUpdate to delete the row entirely
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}:batchUpdate`;

  // First, get the sheet ID for Story Ideation tab
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}?fields=sheets.properties`;
  const metadataResponse = await fetch(metadataUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!metadataResponse.ok) {
    throw new Error('Failed to get sheet metadata');
  }

  const metadata = await metadataResponse.json();
  const storyIdeationSheet = metadata.sheets.find(
    s => s.properties.title === STORY_IDEATION_SHEET_NAME
  );

  if (!storyIdeationSheet) {
    throw new Error('Story Ideation sheet not found');
  }

  const sheetId = storyIdeationSheet.properties.sheetId;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-indexed
            endIndex: rowIndex,
          },
        },
      }],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to delete Story Ideation: ${response.statusText}`);
  }

  return response.json();
};

// ============================================
// COMPETITOR LOG FUNCTIONS
// ============================================

// Competitor Log columns: A: Linked Story, B: Competitor URL, C: Article Title, D: Publisher,
// E: Publish Date, F: Got Coverage (Yes/No/Not Sure), G: Coverage Notes, H: Quality Notes, I: Date Added

// Fetch all Competitor Log entries
export const fetchCompetitorLogData = async (accessToken) => {
  const range = `${COMPETITOR_LOG_SHEET_NAME}!A:I`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to fetch Competitor Log data: ${response.statusText}`);
  }

  const data = await response.json();
  return parseCompetitorLogData(data.values);
};

// Parse Competitor Log data
const parseCompetitorLogData = (values) => {
  if (!values || values.length < 2) {
    return [];
  }

  // Map coverage values from sheet format to internal format
  const mapCoverage = (value) => {
    if (!value) return 'not_sure';
    const lower = value.toLowerCase().trim();
    if (lower === 'yes') return 'yes';
    if (lower === 'no') return 'no';
    return 'not_sure';
  };

  // Skip header row, parse each data row
  return values.slice(1).map((row, index) => ({
    id: `competitor-sheet-${index}`,
    rowIndex: index + 2, // Sheet rows are 1-indexed, plus header row
    linkedStory: row[0] || '', // Store the story title directly
    url: row[1] || '',
    title: row[2] || '',
    publisher: row[3] || '',
    publishDate: row[4] ? convertDateFormat(row[4]) : '',
    gotCoverage: mapCoverage(row[5]),
    coverageNotes: row[6] || '',
    qualityNotes: row[7] || '',
    dateAdded: row[8] ? convertDateFormat(row[8]) : '',
  }));
};

// Append a new Competitor Log entry
export const appendCompetitorLog = async (accessToken, entry, linkedStoryTitle = '') => {
  const range = `${COMPETITOR_LOG_SHEET_NAME}!A:I`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const formatDateForSheet = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${parseInt(match[2])}/${parseInt(match[3])}/${match[1]}`;
    }
    return dateStr;
  };

  // Map internal coverage format to sheet format
  const mapCoverageForSheet = (value) => {
    if (value === 'yes') return 'Yes';
    if (value === 'no') return 'No';
    return 'Not Sure';
  };

  const values = [[
    linkedStoryTitle || '',
    entry.url || '',
    entry.title || '',
    entry.publisher || '',
    formatDateForSheet(entry.publishDate),
    mapCoverageForSheet(entry.gotCoverage),
    entry.coverageNotes || '',
    entry.qualityNotes || '',
    formatDateForSheet(entry.dateAdded || new Date().toISOString().split('T')[0]),
  ]];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to add Competitor Log entry: ${response.statusText}`);
  }

  return response.json();
};

// Update a Competitor Log entry
export const updateCompetitorLog = async (accessToken, rowIndex, entry, linkedStoryTitle = '') => {
  const range = `${COMPETITOR_LOG_SHEET_NAME}!A${rowIndex}:I${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const formatDateForSheet = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${parseInt(match[2])}/${parseInt(match[3])}/${match[1]}`;
    }
    return dateStr;
  };

  const mapCoverageForSheet = (value) => {
    if (value === 'yes') return 'Yes';
    if (value === 'no') return 'No';
    return 'Not Sure';
  };

  const values = [[
    linkedStoryTitle || '',
    entry.url || '',
    entry.title || '',
    entry.publisher || '',
    formatDateForSheet(entry.publishDate),
    mapCoverageForSheet(entry.gotCoverage),
    entry.coverageNotes || '',
    entry.qualityNotes || '',
    formatDateForSheet(entry.dateAdded),
  ]];

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to update Competitor Log entry: ${response.statusText}`);
  }

  return response.json();
};

// Delete a Competitor Log entry
export const deleteCompetitorLog = async (accessToken, rowIndex) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}:batchUpdate`;

  // Get sheet ID for Competitor Log tab
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONTENT_CALENDAR_SPREADSHEET_ID}?fields=sheets.properties`;
  const metadataResponse = await fetch(metadataUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!metadataResponse.ok) {
    throw new Error('Failed to get sheet metadata');
  }

  const metadata = await metadataResponse.json();
  const competitorLogSheet = metadata.sheets.find(
    s => s.properties.title === COMPETITOR_LOG_SHEET_NAME
  );

  if (!competitorLogSheet) {
    throw new Error('Competitor Log sheet not found');
  }

  const sheetId = competitorLogSheet.properties.sheetId;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error('Token expired. Please re-authenticate.');
    }
    throw new Error(`Failed to delete Competitor Log entry: ${response.statusText}`);
  }

  return response.json();
};
