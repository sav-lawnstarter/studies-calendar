import { useState, useEffect } from 'react';

// Hook to fetch US public holidays from Nager.Date API
export function useHolidays(year = 2026) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/US`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch holidays');
        }

        const data = await response.json();

        // Transform to our format - holidays are blocked dates
        const formattedHolidays = data.map(holiday => ({
          date: holiday.date,
          name: holiday.localName,
          category: 'Holiday',
          type: 'blocked',
          isPublicHoliday: true
        }));

        setHolidays(formattedHolidays);
        setError(null);
      } catch (err) {
        setError(err.message);
        setHolidays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
  }, [year]);

  return { holidays, loading, error };
}

// Function to check if a date is a holiday
export function isHoliday(date, holidays) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return holidays.some(h => h.date === dateStr);
}

// Get holiday info for a specific date
export function getHolidayInfo(date, holidays) {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return holidays.find(h => h.date === dateStr);
}
