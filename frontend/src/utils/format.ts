const DAY_MS = 24 * 60 * 60 * 1000;

/** Figma pill format: "Tue 9:15:12 AM" within a week, otherwise "Mar 3, 9:15 AM". */
export function formatPillDate(iso: string): string {
  const date = new Date(iso);
  const diff = Math.abs(date.getTime() - Date.now());
  if (diff < 6 * DAY_MS) {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    return `${weekday} ${time}`;
  }
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Detail header format: "Nov 3, 10:23 AM". */
export function formatDetailDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const abs = Math.abs(diffMs);
  if (abs < 60_000) return formatter.format(Math.round(diffMs / 1000), 'second');
  if (abs < 3_600_000) return formatter.format(Math.round(diffMs / 60_000), 'minute');
  if (abs < DAY_MS) return formatter.format(Math.round(diffMs / 3_600_000), 'hour');
  return formatter.format(Math.round(diffMs / DAY_MS), 'day');
}

/** "john.smith@acme.io" -> "John Smith" */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Value for <input type="datetime-local"> in the user's local timezone. */
export function toDateTimeLocal(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
