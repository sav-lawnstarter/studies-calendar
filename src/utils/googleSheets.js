// Google Sheets API utility for client-side OAuth
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SPREADSHEET_ID = '1L8jwOxU_9lLetVOyuNmdov9p56b4ypbIFCjfjJAiZt8';
const SHEET_NAME = 'Study Story Data';

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

// Fetch data from Google Sheets
export const fetchSheetData = async (accessToken) => {
  const range = `${SHEET_NAME}!A:H`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

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
