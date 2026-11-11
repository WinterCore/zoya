export const toISODateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Local midnight at the start of an ISO date ("2026-11-11"), in epoch ms. */
export const startOfDay = (isoDate: string): number => {
  return new Date(`${isoDate}T00:00:00`).getTime();
};

/** The ISO date `days` days after `isoDate`; negative goes back. */
export const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODateString(date);
};

/**
 * Parses an API timestamp ("2026-11-11 12:38:00") as local time. The ISO "T"
 * form is the only one the spec guarantees, so swap the space for it.
 */
export const parseTimestamp = (timestamp: string): Date => {
  return new Date(timestamp.replace(' ', 'T'));
};
