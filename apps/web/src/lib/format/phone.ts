export interface PhoneCountry {
  iso: string;
  name: string;
  dialCode: string;
}

// Paises de habla hispana (y EE. UU., por su comunidad hispana). Los numeros se
// guardan internacionales sin "+", que es lo que necesita wa.me.
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "AR", name: "Argentina", dialCode: "54" },
  { iso: "BO", name: "Bolivia", dialCode: "591" },
  { iso: "CL", name: "Chile", dialCode: "56" },
  { iso: "CO", name: "Colombia", dialCode: "57" },
  { iso: "CR", name: "Costa Rica", dialCode: "506" },
  { iso: "CU", name: "Cuba", dialCode: "53" },
  { iso: "EC", name: "Ecuador", dialCode: "593" },
  { iso: "SV", name: "El Salvador", dialCode: "503" },
  { iso: "ES", name: "España", dialCode: "34" },
  { iso: "US", name: "Estados Unidos", dialCode: "1" },
  { iso: "GT", name: "Guatemala", dialCode: "502" },
  { iso: "GQ", name: "Guinea Ecuatorial", dialCode: "240" },
  { iso: "HN", name: "Honduras", dialCode: "504" },
  { iso: "MX", name: "México", dialCode: "52" },
  { iso: "NI", name: "Nicaragua", dialCode: "505" },
  { iso: "PA", name: "Panamá", dialCode: "507" },
  { iso: "PY", name: "Paraguay", dialCode: "595" },
  { iso: "PE", name: "Perú", dialCode: "51" },
  { iso: "PR", name: "Puerto Rico", dialCode: "1" },
  { iso: "DO", name: "República Dominicana", dialCode: "1" },
  { iso: "UY", name: "Uruguay", dialCode: "598" },
  { iso: "VE", name: "Venezuela", dialCode: "58" },
];

export const DEFAULT_PHONE_COUNTRY = "BO";

// +1 lo comparten EE. UU., Puerto Rico y Rep. Dominicana: se distinguen por el codigo de area.
const NANP_AREA_CODES: Record<string, string> = {
  "787": "PR",
  "939": "PR",
  "809": "DO",
  "829": "DO",
  "849": "DO",
};

const BY_DIAL_CODE_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

function digitsOf(value: string) {
  return value.replace(/\D/g, "");
}

export function phoneCountry(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.iso === iso) ?? phoneCountry(DEFAULT_PHONE_COUNTRY);
}

/** Separa un numero internacional guardado en pais + numero local. */
export function splitInternationalPhone(
  value: string | null | undefined,
  fallbackCountry: string = DEFAULT_PHONE_COUNTRY,
): { country: string; local: string } {
  const digits = digitsOf(value ?? "");
  const match = BY_DIAL_CODE_LENGTH.find(
    (country) => digits.startsWith(country.dialCode) && digits.length - country.dialCode.length >= 6,
  );
  if (!match) return { country: fallbackCountry, local: digits };

  const local = digits.slice(match.dialCode.length);
  if (match.dialCode === "1") {
    return { country: NANP_AREA_CODES[local.slice(0, 3)] ?? "US", local };
  }
  return { country: match.iso, local };
}

/** Une pais + numero local en el formato internacional que espera el backend. */
export function joinInternationalPhone(countryIso: string, local: string): string {
  // El 0 inicial es el prefijo de llamada nacional; en formato internacional no va.
  const digits = digitsOf(local).replace(/^0+/, "");
  if (!digits) return "";
  return `${phoneCountry(countryIso).dialCode}${digits}`;
}

// Mismas reglas que el backend (domain/value_objects/phone.py).
const BOLIVIA_DIAL_CODE = "591";
const BOLIVIA_LOCAL_RE = /^[2-7]\d{7}$/;
const INTERNATIONAL_RE = /^[1-9]\d{9,14}$/;

/** Cuantos digitos puede tener el numero local de ese pais (Bolivia: 8). */
export function localPhoneMaxLength(countryIso: string): number {
  const { dialCode } = phoneCountry(countryIso);
  return dialCode === BOLIVIA_DIAL_CODE ? 8 : 15 - dialCode.length;
}

/**
 * Lo que la persona escribio o pego en el campo del numero local, dejando
 * solo digitos. Si pego el numero con el codigo de pais, se lo quita.
 */
export function sanitizeLocalPhone(countryIso: string, typed: string): string {
  let digits = digitsOf(typed);
  const max = localPhoneMaxLength(countryIso);
  const { dialCode } = phoneCountry(countryIso);
  const pastedWithCode = typed.trim().startsWith("+") || digits.length > max;
  if (pastedWithCode && digits.startsWith(dialCode)) digits = digits.slice(dialCode.length);
  return digits.slice(0, max);
}

/** Valida el numero internacional que arma PhoneCountryInput; undefined si esta bien. */
export function validateInternationalPhone(value: string, { required = false } = {}): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return required ? "Escribe el teléfono" : undefined;
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) return "El teléfono solo puede tener números";
  let digits = digitsOf(trimmed);
  if (!trimmed.startsWith("+")) {
    // Sin codigo de pais se asume Bolivia, como en el backend.
    digits = digits.replace(/^0+/, "");
    if (digits.length === 8) digits = BOLIVIA_DIAL_CODE + digits;
  }
  if (digits.startsWith(BOLIVIA_DIAL_CODE)) {
    return BOLIVIA_LOCAL_RE.test(digits.slice(BOLIVIA_DIAL_CODE.length))
      ? undefined
      : "Un número de Bolivia tiene 8 dígitos, ej. 70012345";
  }
  return INTERNATIONAL_RE.test(digits)
    ? undefined
    : "Revisa el número: con el código de país debe tener entre 10 y 15 dígitos";
}

/** Para mostrar: "+591 70012345". Numeros viejos sin codigo se toman como de Bolivia. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const { country, local } = splitInternationalPhone(value);
  return local ? `+${phoneCountry(country).dialCode} ${local}` : "";
}
