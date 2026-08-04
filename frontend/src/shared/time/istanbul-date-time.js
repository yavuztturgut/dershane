export const BUSINESS_TIME_ZONE = 'Europe/Istanbul';

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hourCycle: 'h23',
});

function partsInIstanbul(date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
  parts.millisecond = parts.fractionalSecond || 0;
  return parts;
}

function hasValidCalendarParts(parts) {
  if (parts.year < 1000 || parts.year > 9999 || parts.month < 1 || parts.month > 12
      || parts.day < 1 || parts.hour < 0 || parts.hour > 23 || parts.minute < 0 || parts.minute > 59
      || parts.second < 0 || parts.second > 59 || parts.millisecond < 0 || parts.millisecond > 999) return false;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond));
  return date.getUTCFullYear() === parts.year && date.getUTCMonth() + 1 === parts.month && date.getUTCDate() === parts.day;
}

function wallClockParts(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate(),
      hour: value.getHours(), minute: value.getMinutes(), second: value.getSeconds(), millisecond: value.getMilliseconds(),
    };
  }
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  if (!match) return null;
  return {
    year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
    hour: Number(match[4]), minute: Number(match[5]), second: Number(match[6] || 0),
    millisecond: Number((match[7] || '0').padEnd(3, '0')),
  };
}

export function istanbulWallClockToInstant(value) {
  const parts = wallClockParts(value);
  if (!parts || !hasValidCalendarParts(parts)) return null;
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
  let candidate = new Date(target);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsInIstanbul(candidate);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, actual.millisecond);
    const next = new Date(candidate.getTime() + target - represented);
    if (next.getTime() === candidate.getTime()) break;
    candidate = next;
  }
  const actual = partsInIstanbul(candidate);
  return ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'].every((key) => actual[key] === parts[key]) ? candidate : null;
}

export function istanbulWallClockToIso(value) {
  return istanbulWallClockToInstant(value)?.toISOString() || null;
}

const pad = (value) => String(value).padStart(2, '0');

export function instantToIstanbulCalendarDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = partsInIstanbul(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

export function instantToIstanbulPickerDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = partsInIstanbul(date);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function formatIstanbulDateTime(value, locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: BUSINESS_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

export function formatIstanbulTime(value, locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}
