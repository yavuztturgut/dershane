const BUSINESS_TIME_ZONE = 'Europe/Istanbul';

const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
    hourCycle: 'h23'
});

function zonedParts(date) {
    const parts = Object.fromEntries(
        formatter.formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, Number(part.value)])
    );
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

function wallClockToDate(parts) {
    const wallClockUtc = Date.UTC(
        parts.year, parts.month - 1, parts.day,
        parts.hour, parts.minute, parts.second || 0, parts.millisecond || 0
    );
    let candidate = new Date(wallClockUtc);
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const actual = zonedParts(candidate);
        const representedAsUtc = Date.UTC(
            actual.year, actual.month - 1, actual.day,
            actual.hour, actual.minute, actual.second, actual.millisecond
        );
        const next = new Date(candidate.getTime() + wallClockUtc - representedAsUtc);
        if (next.getTime() === candidate.getTime()) break;
        candidate = next;
    }

    const actual = zonedParts(candidate);
    if (['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'].some((key) => actual[key] !== (parts[key] || 0))) {
        return null;
    }
    return candidate;
}

function parseIstanbulDateTime(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }
    if (typeof value !== 'string') return null;
    const input = value.trim();

    const instantMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-](\d{2}):?(\d{2}))$/i);
    if (instantMatch) {
        const parts = {
            year: Number(instantMatch[1]), month: Number(instantMatch[2]), day: Number(instantMatch[3]),
            hour: Number(instantMatch[4]), minute: Number(instantMatch[5]), second: Number(instantMatch[6] || 0),
            millisecond: Number((instantMatch[7] || '0').padEnd(3, '0'))
        };
        if (!hasValidCalendarParts(parts) || (instantMatch[8] !== 'Z' && (Number(instantMatch[9]) > 23 || Number(instantMatch[10]) > 59))) return null;
        const instant = new Date(input);
        return Number.isNaN(instant.getTime()) ? null : instant;
    }

    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
    if (!match) return null;
    const [, year, month, day, hour, minute, second = '0', milliseconds = '0'] = match;
    const parts = {
        year: Number(year), month: Number(month), day: Number(day),
        hour: Number(hour), minute: Number(minute), second: Number(second),
        millisecond: Number(milliseconds.padEnd(3, '0'))
    };
    return hasValidCalendarParts(parts) ? wallClockToDate(parts) : null;
}

function formatIstanbulDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = zonedParts(date);
    const pad = (part) => String(part).padStart(2, '0');
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function parseIstanbulDateBoundary(value, nextDay = false) {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    let parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: 0, minute: 0, second: 0, millisecond: 0 };
    if (!hasValidCalendarParts(parts)) return null;
    if (nextDay) {
        const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
        parts = { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate(), hour: 0, minute: 0, second: 0, millisecond: 0 };
    }
    return wallClockToDate(parts);
}

module.exports = { BUSINESS_TIME_ZONE, formatIstanbulDateKey, parseIstanbulDateBoundary, parseIstanbulDateTime };
