// LawnStarter fiscal calendar, used for the yearly and quarterly views.
//
//   Q1: March - May        Q2: June - August
//   Q3: September - November   Q4: December - February
//
// A fiscal year runs March through February and is named for the calendar
// year it starts in: FY2025 = March 2025 - February 2026 (so December 2025
// and January 2026 are both Q4 FY2025). Change FISCAL_YEAR_LABEL_OFFSET to
// 1 to name it for the year it ends in instead.

const FISCAL_YEAR_LABEL_OFFSET = 0;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Parse sheet dates: YYYY-MM-DD, M/D/YYYY or M/D/YY. Returns { year, month, day } or null.
export const parsePitchDate = (value) => {
  if (!value) return null;
  const str = String(value).trim();

  let match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return validate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    return validate(year, Number(match[1]), Number(match[2]));
  }

  return null;
};

const validate = (year, month, day) => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
};

// Fiscal period for a date string, or null if the date is blank/unparseable.
export const getFiscalPeriod = (value) => {
  const date = parsePitchDate(value);
  if (!date) return null;

  const { year, month } = date;
  // Jan and Feb belong to the fiscal year that started the previous March
  const startYear = month >= 3 ? year : year - 1;
  const quarter = month >= 3 ? Math.floor((month - 3) / 3) + 1 : 4;
  const name = startYear + FISCAL_YEAR_LABEL_OFFSET;

  return {
    startYear,
    quarter,
    yearKey: `FY${name}`,
    quarterKey: `FY${name}-Q${quarter}`,
    quarterShort: `Q${quarter} FY${name}`,
  };
};

// Month range label for a fiscal year, e.g. "Mar 2025 - Feb 2026"
const yearRange = (startYear) => `${MONTH_NAMES[2]} ${startYear} – ${MONTH_NAMES[1]} ${startYear + 1}`;

// Month range label for a quarter, e.g. "Sep - Nov 2025" or "Dec 2025 - Feb 2026"
const quarterRange = (startYear, quarter) => {
  switch (quarter) {
    case 1: return `Mar – May ${startYear}`;
    case 2: return `Jun – Aug ${startYear}`;
    case 3: return `Sep – Nov ${startYear}`;
    default: return `Dec ${startYear} – Feb ${startYear + 1}`;
  }
};

export const yearLabel = (period) => `${period.yearKey} (${yearRange(period.startYear)})`;
export const quarterLabel = (period) => `${period.quarterShort} (${quarterRange(period.startYear, period.quarter)})`;

// Distinct periods present in the data, newest first.
// mode: 'year' | 'quarter'. Returns [{ key, label }].
export const listPeriods = (items, mode, getDate) => {
  const seen = new Map();
  items.forEach(item => {
    const period = getFiscalPeriod(getDate(item));
    if (!period) return;
    const key = mode === 'year' ? period.yearKey : period.quarterKey;
    if (!seen.has(key)) {
      seen.set(key, {
        key,
        label: mode === 'year' ? yearLabel(period) : quarterLabel(period),
        sort: period.startYear * 10 + (mode === 'year' ? 0 : period.quarter),
      });
    }
  });
  return [...seen.values()].sort((a, b) => b.sort - a.sort).map(({ key, label }) => ({ key, label }));
};

// Items whose date falls in the given period. mode 'all' returns everything.
export const filterByPeriod = (items, mode, key, getDate) => {
  if (mode === 'all') return items;
  return items.filter(item => {
    const period = getFiscalPeriod(getDate(item));
    if (!period) return false;
    return (mode === 'year' ? period.yearKey : period.quarterKey) === key;
  });
};
