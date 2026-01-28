// Google Sheets API utility for client-side OAuth
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
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
  const range = `${STUDY_SHEET_NAME}!A:L`;
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
const DATE_FIELDS = ['pitch_date', 'analysis_due_by', 'edits_due_by', 'qa_due_by', 'production_date'];

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

// Parse sheet data into structured objects
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
      item[key] = row[colIndex] || '';
    });
    return item;
  });
};

// Logout / clear stored token
export const clearGoogleAuth = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};
