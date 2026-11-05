"use client";

import { useState } from "react";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  joinInternationalPhone,
  splitInternationalPhone,
} from "@/lib/format/phone";
import { Input } from "./Input";
import { Select } from "./Select";

/**
 * Selector de pais + numero local. Envia en `name` el numero internacional
 * (codigo de pais + numero, solo digitos), listo para wa.me.
 */
export function PhoneCountryInput({
  id,
  name,
  defaultValue,
  defaultCountry = DEFAULT_PHONE_COUNTRY,
  placeholder,
  required,
  disabled,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  defaultCountry?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const initial = splitInternationalPhone(defaultValue, defaultCountry);
  const [country, setCountry] = useState(initial.country);
  const [local, setLocal] = useState(initial.local);

  return (
    <div className="flex gap-2">
      {/* Select trae w-full: el ancho fijo va en el contenedor. */}
      <div className="w-32 shrink-0">
        <Select
          aria-label="Codigo de pais"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
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
          inputMode="tel"
          autoComplete="tel-national"
          value={local}
          onChange={(event) => setLocal(event.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={20}
        />
      </div>
      <input type="hidden" name={name} value={joinInternationalPhone(country, local)} />
    </div>
  );
}
