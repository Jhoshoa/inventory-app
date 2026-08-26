// Zona horaria fija (no la del sistema): el servidor y el navegador pueden
// correr en zonas distintas, y sin esto el mismo timestamp se formatea
// diferente en cada uno, causando errores de hidratacion en componentes
// cliente. El negocio opera unicamente en Bolivia, asi que fijarla es correcto.
const BOLIVIA_TIMEZONE = "America/La_Paz";

const dateTimeShortFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: BOLIVIA_TIMEZONE,
});

const dateLongFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: BOLIVIA_TIMEZONE,
});

const businessDateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

// Node y los navegadores pueden traer versiones de ICU distintas que, para el
// mismo locale/valor, usan un caracter de espacio distinto alrededor de
// "a. m."/"p. m." (espacio normal U+0020 vs. NBSP U+00A0 o espacio angosto
// U+202F). Esa diferencia de un solo caracter invisible ya causo un error de
// hidratacion; se normaliza todo a espacio normal para que el string sea
// siempre identico sin importar el entorno donde se ejecute.
const WHITESPACE_VARIANTS_RE = /[    ]/g;

function normalizeSpaces(text: string): string {
  return text.replace(WHITESPACE_VARIANTS_RE, " ");
}

export function formatDateTimeShort(value: string) {
  return normalizeSpaces(dateTimeShortFormatter.format(new Date(value)));
}

export function formatDateLong(value: string) {
  try {
    return normalizeSpaces(dateLongFormatter.format(new Date(value)));
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
