'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  DROPDOWN_INPUT_CLASS,
  DROPDOWN_OPTION_CLASS,
  DROPDOWN_OPTION_SELECTED_CLASS,
  DROPDOWN_OPTION_UNSELECTED_CLASS,
  DROPDOWN_PANEL_CLASS,
} from '@/components/ui/dropdownStyles';

interface SearchableSelectOption {
  value: string;
  label: string;
  // Extra text to filter against (e.g. an alternate script/language
  // spelling) without it being shown as the option's own label.
  searchText?: string;
}

interface SearchableSelectProps {
  label?: string;
  error?: string;
  options: readonly SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
}

const MAX_VISIBLE = 30;

// A Select whose list is filtered as the user types, matching against each
// option's label (and optional searchText, e.g. an alternate script's
// spelling) by substring rather than the native <select>'s browser-default
// prefix-only typeahead. Unlike Combobox (components/ui/Combobox.tsx), the
// committed value is always one of `options` — there's no freeform entry,
// since this is used for id-backed lists (e.g. a country), not a text field.
export function SearchableSelect({
  label,
  error,
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  name,
  id,
  disabled,
}: SearchableSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputId = id ?? name;

  // If `value` changes from outside while the field is open (mid-filter),
  // close it on the spot — adjusted during render (React's documented
  // pattern for "state that depends on a prop changing", not a useEffect)
  // so `displayValue` below falls back to the newly-selected label instead
  // of continuing to show a stale/unrelated typed query. Covers any future
  // caller that sets the bound value while this is focused (e.g. an OCR/
  // autofill wired the way BrandModelFields' model field already is), not
  // just a value set while unfocused.
  const [lastSeenValue, setLastSeenValue] = useState(value);
  if (value !== lastSeenValue) {
    setLastSeenValue(value);
    if (isOpen) setIsOpen(false);
  }

  const selected = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  // While closed, the input always mirrors the selected option's label —
  // derived straight from props/state instead of synced via an effect, so
  // it's automatically right for the initial value, a value set from
  // outside (e.g. form reset), and reverting after a blur with no selection.
  const displayValue = isOpen ? query : selected?.label ?? '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, MAX_VISIBLE);
    return options
      .filter((opt) => (opt.searchText ?? opt.label).toLowerCase().includes(q))
      .slice(0, MAX_VISIBLE);
  }, [options, query]);

  return (
    <div className="relative flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        autoComplete="off"
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => {
          setIsOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => {
          setIsOpen(false);
          onBlur?.();
        }}
        className={clsx(
          DROPDOWN_INPUT_CLASS,
          error ? 'border-red-400' : 'border-slate-300 dark:border-slate-700',
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}

      {isOpen && (
        <div className={DROPDOWN_PANEL_CLASS}>
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={clsx(
                  DROPDOWN_OPTION_CLASS,
                  opt.value === value ? DROPDOWN_OPTION_SELECTED_CLASS : DROPDOWN_OPTION_UNSELECTED_CLASS,
                )}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <p className="px-4 py-2 text-sm text-slate-400">{t('common.noResults')}</p>
          )}
        </div>
      )}
    </div>
  );
}
