const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

export type ParsedTimestamp = {
  timestamp: string;
  date: Date;
};

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year: number, month: number): number {
  const daysByMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return daysByMonth[month - 1] ?? 0;
}

function invalidTimestamp(fieldName: string): Error {
  return new Error(`${fieldName} must be a valid timestamp in ISO-8601 format with a timezone.`);
}

export function parseTimestamp(timestamp: string, fieldName: string): ParsedTimestamp {
  if (typeof timestamp !== 'string') {
    throw invalidTimestamp(fieldName);
  }

  const trimmedTimestamp = timestamp.trim();

  if (trimmedTimestamp.length === 0) {
    throw new Error(`${fieldName} must not be blank.`);
  }

  const match = TIMESTAMP_PATTERN.exec(trimmedTimestamp);

  if (!match) {
    throw invalidTimestamp(fieldName);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millisecond = Number((match[7] ?? '').padEnd(3, '0'));
  const offsetSign = match[9];
  const offsetHour = Number(match[10] ?? 0);
  const offsetMinute = Number(match[11] ?? 0);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > getDaysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 14 ||
    offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) {
    throw invalidTimestamp(fieldName);
  }

  const localTime = new Date(0);
  localTime.setUTCFullYear(year, month - 1, day);
  localTime.setUTCHours(hour, minute, second, millisecond);

  const offsetMinutes = offsetHour * 60 + offsetMinute;
  const signedOffsetMinutes = offsetSign === '+' ? offsetMinutes : -offsetMinutes;
  const date = new Date(localTime.getTime() - signedOffsetMinutes * 60_000);

  return { timestamp: trimmedTimestamp, date };
}
