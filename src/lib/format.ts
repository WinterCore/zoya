import {addDays} from "./utils";

// Formats are pinned to en-US: the phone's own locale may use other digits (e.g. Arabic).

export const formatHours = (value: number) => {
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
};

export const formatPercent = (value: number) => {
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 0, style: "percent" }).format(value);
};

export const formatDateTime = (value: Date) => {
  return Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true  }).format(value);
}

export const formatNumber = (value: number) => {
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

const clockFormat = Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

/** "2:10am" */
export const formatClock = (time: number) => {
  const parts = clockFormat.formatToParts(time);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")}${part("dayPeriod").toLowerCase()}`;
};

/** "2h 06m", or "45m" under an hour. */
export const formatShortDuration = (ms: number) => {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, "0")}m`;
};

/** "760 W", or "2.4 kW" from 1,000 W up. */
export const formatPower = (watts: number) => {
  if (watts < 1000) {
    return `${formatNumber(watts)} W`;
  }
  return `${Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(watts / 1000)} kW`;
};

/** "3.1 kWh", with two decimals under 1 kWh. */
export const formatEnergy = (wh: number) => {
  const digits = wh < 1000 ? 2 : 1;
  return `${Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(wh / 1000)} kWh`;
};

/** "Today", "Yesterday", or "Mon, Nov 10" (with the year when it isn't this year's). */
export const formatDayLabel = (isoDate: string, today: string) => {
  if (isoDate === today) {
    return "Today";
  }
  if (isoDate === addDays(today, -1)) {
    return "Yesterday";
  }

  const sameYear = isoDate.slice(0, 4) === today.slice(0, 4);
  return Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(!sameYear && { year: 'numeric' }),
  }).format(new Date(`${isoDate}T00:00:00`));
};

/** "Mon" */
export const formatWeekday = (isoDate: string) => {
  return Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${isoDate}T00:00:00`));
};
