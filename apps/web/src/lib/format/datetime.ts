const dateTimeShortFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "short",
  timeStyle: "short",
});

const dateLongFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const businessDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export function formatDateTimeShort(value: string) {
  return dateTimeShortFormatter.format(new Date(value));
}

export function formatDateLong(value: string) {
  try {
    return dateLongFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export function formatBusinessDate(value: string) {
  return businessDateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

export function formatBusinessDateShort(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function formatDateTimeWithTimezone(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("es-BO", {
    timeZone: timezone,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const day = part("day");
  const month = part("month");
  const year = part("year");
  const hour = part("hour");
  const minute = part("minute");
  if (!day || !month || !year || !hour || !minute) return value;
  return `${day}/${month}/${year}, ${hour}:${minute}`;
}
