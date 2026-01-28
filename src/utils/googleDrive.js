// Google Drive API utility for copying templates

// Template IDs from environment variables
const LAWNSTARTER_TEMPLATE_ID = import.meta.env.VITE_LAWNSTARTER_TEMPLATE_ID;
const LAWNLOVE_TEMPLATE_ID = import.meta.env.VITE_LAWNLOVE_TEMPLATE_ID;

// Get configured templates
export const getTemplates = () => {
  const templates = [];

  if (LAWNSTARTER_TEMPLATE_ID) {
    templates.push({
      id: LAWNSTARTER_TEMPLATE_ID,
      brand: 'LawnStarter',
      color: '#069C55',
    });
  }

  if (LAWNLOVE_TEMPLATE_ID) {
    templates.push({
      id: LAWNLOVE_TEMPLATE_ID,
      brand: 'Lawn Love',
      color: '#246227',
    });
  }

  return templates;
};

// Check if templates are configured
export const hasTemplatesConfigured = () => {
  return Boolean(LAWNSTARTER_TEMPLATE_ID || LAWNLOVE_TEMPLATE_ID);
};

// Copy a template file in Google Drive
export const copyTemplate = async (accessToken, templateId, newFileName) => {
  const url = `https://www.googleapis.com/drive/v3/files/${templateId}/copy`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: newFileName,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error('Token expired. Please re-authenticate.');
    }
    if (response.status === 403) {
      throw new Error('Permission denied. Make sure you have access to the template and the Drive API scope is enabled.');
    }
    if (response.status === 404) {
      throw new Error('Template not found. Please check the template ID in your configuration.');
    }
    throw new Error(error.error?.message || `Failed to copy template: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: `https://docs.google.com/document/d/${data.id}/edit`,
    webContentLink: data.webContentLink,
  };
};

// Get template info (name, etc.)
export const getTemplateInfo = async (accessToken, templateId) => {
  const url = `https://www.googleapis.com/drive/v3/files/${templateId}?fields=id,name,mimeType`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to get template info: ${response.statusText}`);
  }

  return response.json();
};
