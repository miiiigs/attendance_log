import {
  DEFAULT_GRACE_PERIOD_MINUTES,
  DEFAULT_TIMEZONE,
  DEFAULT_WORK_START_TIME,
} from "../constants/app";

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "full",
  timeZone: DEFAULT_TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: DEFAULT_TIMEZONE,
});

export function formatAttendanceDate(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatAttendanceTime(value: string | Date | null) {
  if (!value) {
    return "--";
  }

  return timeFormatter.format(new Date(value));
}

export function getFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export function getAttendanceGreeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      hour12: false,
      timeZone: DEFAULT_TIMEZONE,
    }).format(date),
  );

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function isLate(
  timeIn: string | Date | null,
  workStartTime = DEFAULT_WORK_START_TIME,
  gracePeriodMinutes = DEFAULT_GRACE_PERIOD_MINUTES,
) {
  if (!timeIn) {
    return false;
  }

  const [rawStartHour, rawStartMinute] = workStartTime.split(":");
  const startHour = Number(rawStartHour ?? "08");
  const startMinute = Number(rawStartMinute ?? "00");
  const candidate = new Date(timeIn);
  const localParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(candidate);

  const year = Number(localParts.find((part) => part.type === "year")?.value);
  const month = Number(localParts.find((part) => part.type === "month")?.value);
  const day = Number(localParts.find((part) => part.type === "day")?.value);

  const scheduledUtc = new Date(
    Date.UTC(year, month - 1, day, startHour, startMinute + gracePeriodMinutes),
  );

  const actualMinutes = Number(
    new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZone: DEFAULT_TIMEZONE,
    })
      .format(candidate)
      .split(":")
      .reduce((total, value, index) => total + Number(value) * (index === 0 ? 60 : 1), 0),
  );

  const scheduledMinutes = scheduledUtc.getUTCHours() * 60 + scheduledUtc.getUTCMinutes();

  return actualMinutes > scheduledMinutes;
}
