// Browser Notification utility for deadline reminders

const NOTIFICATION_STORAGE_KEY = 'editorial-notification-settings';
const NOTIFIED_DEADLINES_KEY = 'editorial-notified-deadlines';

// Check if browser supports notifications
export const isNotificationSupported = () => {
  return 'Notification' in window;
};

// Get current notification permission status
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

// Get notification settings from localStorage
export const getNotificationSettings = () => {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading notification settings:', e);
  }
  return {
    enabled: true,
    daysBeforeDeadline: 1, // Notify 1 day before deadline
    notifyOnDay: true, // Also notify on the day of deadline
  };
};

// Save notification settings
export const saveNotificationSettings = (settings) => {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
};

// Get list of already notified deadlines (to avoid duplicate notifications)
const getNotifiedDeadlines = () => {
  try {
    const stored = localStorage.getItem(NOTIFIED_DEADLINES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading notified deadlines:', e);
  }
  return {};
};

// Mark a deadline as notified
const markDeadlineNotified = (deadlineId, dateKey) => {
  try {
    const notified = getNotifiedDeadlines();
    if (!notified[deadlineId]) {
      notified[deadlineId] = {};
    }
    notified[deadlineId][dateKey] = Date.now();
    localStorage.setItem(NOTIFIED_DEADLINES_KEY, JSON.stringify(notified));
  } catch (e) {
    console.error('Error marking deadline notified:', e);
  }
};

// Check if we already sent notification for this deadline
const hasBeenNotified = (deadlineId, dateKey) => {
  const notified = getNotifiedDeadlines();
  return notified[deadlineId]?.[dateKey] != null;
};

// Send a browser notification
export const sendNotification = (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  const notification = new Notification(title, {
    icon: '/LawnStarter_new_logo.png',
    badge: '/LawnStarter_new_logo.png',
    ...options,
  });

  // Auto-close after 10 seconds
  setTimeout(() => notification.close(), 10000);

  return notification;
};

// Check deadlines and send notifications
export const checkAndNotifyDeadlines = (events) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return [];
  }

  const settings = getNotificationSettings();
  if (!settings.enabled) {
    return [];
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notifications = [];

  // Deadline fields to check for approved stories
  const deadlineFields = [
    { field: 'analysisDueBy', label: 'Analysis Due' },
    { field: 'editsDueBy', label: 'Edits Due' },
    { field: 'qaDueBy', label: 'QA Due' },
    { field: 'productionDate', label: 'Production' },
  ];

  events.forEach((event) => {
    // Only check approved stories (they have deadline fields)
    if (event.displayType !== 'approvedStory') {
      return;
    }

    deadlineFields.forEach(({ field, label }) => {
      const dateStr = event[field];
      if (!dateStr) return;

      // Parse the date (try both ISO and MM/DD/YYYY formats)
      let deadlineDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        deadlineDate = new Date(dateStr + 'T00:00:00');
      } else {
        const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) {
          const [, month, day, year] = match;
          deadlineDate = new Date(year, parseInt(month) - 1, parseInt(day));
        } else {
          return; // Can't parse date
        }
      }

      const deadlineId = `${event.id}-${field}`;
      const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

      // Check if we should notify
      let shouldNotify = false;
      let notifyType = '';

      if (daysUntil === 0 && settings.notifyOnDay) {
        shouldNotify = true;
        notifyType = 'today';
      } else if (daysUntil > 0 && daysUntil <= settings.daysBeforeDeadline) {
        shouldNotify = true;
        notifyType = 'upcoming';
      }

      if (shouldNotify) {
        const dateKey = `${notifyType}-${today.toISOString().split('T')[0]}`;

        if (!hasBeenNotified(deadlineId, dateKey)) {
          const storyTitle = event.storyTitle || event.title || 'Story';
          const brand = event.brand ? `[${event.brand}] ` : '';

          let message;
          if (daysUntil === 0) {
            message = `${brand}${storyTitle}: ${label} is due TODAY!`;
          } else if (daysUntil === 1) {
            message = `${brand}${storyTitle}: ${label} is due tomorrow`;
          } else {
            message = `${brand}${storyTitle}: ${label} is due in ${daysUntil} days`;
          }

          notifications.push({
            id: deadlineId,
            title: `Deadline ${daysUntil === 0 ? 'Today' : 'Approaching'}`,
            message,
            event,
            field,
            label,
            daysUntil,
            dateKey,
          });
        }
      }
    });

    // Also check the pitch date (main story date)
    if (event.date) {
      const pitchDate = new Date(event.date + 'T00:00:00');
      const daysUntil = Math.ceil((pitchDate - today) / (1000 * 60 * 60 * 24));
      const deadlineId = `${event.id}-pitch`;

      let shouldNotify = false;
      let notifyType = '';

      if (daysUntil === 0 && settings.notifyOnDay) {
        shouldNotify = true;
        notifyType = 'today';
      } else if (daysUntil > 0 && daysUntil <= settings.daysBeforeDeadline) {
        shouldNotify = true;
        notifyType = 'upcoming';
      }

      if (shouldNotify) {
        const dateKey = `${notifyType}-${today.toISOString().split('T')[0]}`;

        if (!hasBeenNotified(deadlineId, dateKey)) {
          const storyTitle = event.storyTitle || event.title || 'Story';
          const brand = event.brand ? `[${event.brand}] ` : '';

          let message;
          if (daysUntil === 0) {
            message = `${brand}${storyTitle}: Pitch date is TODAY!`;
          } else if (daysUntil === 1) {
            message = `${brand}${storyTitle}: Pitch date is tomorrow`;
          } else {
            message = `${brand}${storyTitle}: Pitch date in ${daysUntil} days`;
          }

          notifications.push({
            id: deadlineId,
            title: `Pitch ${daysUntil === 0 ? 'Today' : 'Approaching'}`,
            message,
            event,
            field: 'pitch',
            label: 'Pitch Date',
            daysUntil,
            dateKey,
          });
        }
      }
    }
  });

  // Send the notifications and mark them as sent
  notifications.forEach((notif) => {
    sendNotification(notif.title, {
      body: notif.message,
      tag: notif.id,
      requireInteraction: notif.daysUntil === 0, // Require interaction for same-day deadlines
    });
    markDeadlineNotified(notif.id, notif.dateKey);
  });

  return notifications;
};

// Clear old notified deadlines (older than 7 days)
export const cleanupNotifiedDeadlines = () => {
  try {
    const notified = getNotifiedDeadlines();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    Object.keys(notified).forEach((deadlineId) => {
      Object.keys(notified[deadlineId]).forEach((dateKey) => {
        if (notified[deadlineId][dateKey] < sevenDaysAgo) {
          delete notified[deadlineId][dateKey];
        }
      });
      if (Object.keys(notified[deadlineId]).length === 0) {
        delete notified[deadlineId];
      }
    });

    localStorage.setItem(NOTIFIED_DEADLINES_KEY, JSON.stringify(notified));
  } catch (e) {
    console.error('Error cleaning up notified deadlines:', e);
  }
};
