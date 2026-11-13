"use client";

import { useState } from "react";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  joinInternationalPhone,
  sanitizeLocalPhone,
  splitInternationalPhone,
} from "@/lib/format/phone";
import { Input } from "./Input";
import { Select } from "./Select";

/**
 * Selector de pais (Bolivia por defecto) + numero local. El campo solo acepta
 * digitos y envia en `name` el numero internacional (codigo de pais + numero,
 * solo digitos), listo para wa.me. La validacion la hace cada formulario con
 * validateInternationalPhone, igual que el backend.
 */
export function PhoneCountryInput({
  id,
  name,
  defaultValue,
  defaultCountry = DEFAULT_PHONE_COUNTRY,
  placeholder,
  required,
  disabled,
  error,
  errorId,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  defaultCountry?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  /** id del mensaje de error, para lectores de pantalla. */
  errorId?: string;
}) {
  const initial = splitInternationalPhone(defaultValue, defaultCountry);
  const [country, setCountry] = useState(initial.country);
  const [local, setLocal] = useState(() => sanitizeLocalPhone(initial.country, initial.local));

  return (
    <div className="flex gap-2">
      {/* Select trae w-full: el ancho fijo va en el contenedor. */}
      <div className="w-32 shrink-0">
        <Select
          aria-label="Código de país"
          value={country}
          onChange={(event) => {
            const next = event.target.value;
            setCountry(next);
            setLocal((current) => sanitizeLocalPhone(next, current));
          }}
          disabled={disabled}
          className="px-2"
        >
          {PHONE_COUNTRIES.map((option) => (
            <option key={option.iso} value={option.iso}>
              +{option.dialCode} {option.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-0 flex-1">
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          // Sin maxLength: cortaria un numero pegado con codigo de pais antes de limpiarlo.
          value={local}
          onChange={(event) => setLocal(sanitizeLocalPhone(country, event.target.value))}
          placeholder={placeholder ?? (country === "BO" ? "70012345" : undefined)}
          required={required}
          disabled={disabled}
          error={error}
          errorId={errorId}
        />
      </div>
      <input type="hidden" name={name} value={joinInternationalPhone(country, local)} />
    </div>
  );
}
