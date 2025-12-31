export const formatHours = (value: number) => {
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
};

export const formatPercent = (value: number) => {
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 2, style: "percent" }).format(value);
};

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const formatDate = (value: Date) => {
  return Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(value);
};

export const formatDateTime = (value: Date) => {
  return Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true  }).format(value);
}

export const formatNumber = (value: number) => {
  return Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export const formatDuration = (hours: number): string => {
  const totalMinutes = Math.floor(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const minuteStr = m === 1 ? "1 minute" : `${m} minutes`;
  const hourStr = h === 1 ? "1 hour" : `${h} hours`;

  if (h === 0) return minuteStr;
  if (m === 0) return hourStr;
  return `${hourStr} and ${minuteStr}`;
}
