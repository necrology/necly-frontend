"use client";

import Select, { type SingleValue } from "react-select";
import { useId } from "react";

// Menu dirender lewat portal ke `document.body`, di luar dialog. Nilainya harus
// lebih tinggi dari `.modal-overlay` (200) agar daftar opsi tidak tertutup
// backdrop modal dan tetap bisa diklik.
const MENU_PORTAL_Z_INDEX = 1000;

export type SearchableSelectOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  inputId?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  required?: boolean;
  "aria-invalid"?: boolean;
  name?: string;
  className?: string;
  onBlur?: () => void;
  maxMenuHeight?: number;
};

/**
 * Standar dropdown project: react-select single-select dengan pencarian.
 *
 * `name` dirender sebagai hidden input berisi nilai terpilih supaya FormData
 * dan handler form lama tetap membaca field yang sama. `required`, `onBlur`,
 * dan `aria-invalid` diteruskan ke input react-select agar validasi serta
 * aksesibilitas form tetap berjalan. Menu memakai portal ke `document.body`
 * supaya tidak terpotong tabel atau container ber-overflow.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  ariaLabel,
  inputId,
  placeholder = "Pilih…",
  isDisabled = false,
  isClearable = false,
  required = false,
  "aria-invalid": ariaInvalid,
  name,
  className,
  onBlur,
  maxMenuHeight = 260,
}: SearchableSelectProps) {
  const selected = options.find((option) => option.value === value) ?? null;
  // react-select memakai penghitung global untuk id internal; itu berbeda antara
  // render server dan klien dan memicu hydration mismatch. useId stabil di dua
  // sisi, jadi id live-region/input tetap sama saat hidrasi.
  const instanceId = useId().replace(/:/g, "");

  // Portal hanya tersedia di browser; komponen tetap aman saat SSR.
  const portalTarget = typeof document === "undefined" ? undefined : document.body;

  const handleChange = (option: SingleValue<SearchableSelectOption>) => {
    onChange(option?.value ?? "");
  };

  return (
    <div className={`searchable-select ${className ?? ""}`.trim()} data-disabled={isDisabled || undefined}>
      <Select<SearchableSelectOption, false>
        instanceId={instanceId}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        inputId={inputId}
        classNamePrefix="necly-select"
        options={options}
        value={selected}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        noOptionsMessage={() => "Tidak ada pilihan"}
        isSearchable
        isDisabled={isDisabled}
        isClearable={isClearable}
        required={required}
        menuPortalTarget={portalTarget}
        menuPosition="fixed"
        maxMenuHeight={maxMenuHeight}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: MENU_PORTAL_Z_INDEX }),
          menu: (base) => ({ ...base, zIndex: MENU_PORTAL_Z_INDEX }),
        }}
      />
      {name && <input type="hidden" name={name} value={value} required={required} />}
    </div>
  );
}
