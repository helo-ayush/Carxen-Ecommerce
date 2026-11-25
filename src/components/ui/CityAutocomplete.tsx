'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { INDIAN_CITIES_WITH_STATE, type IndianCityOption } from '@/lib/validation/storefront-schemas';

export interface CityAutocompleteProps {
  value: string;
  stateFilter?: string;
  onChange: (city: string) => void;
  onSelectCity?: (city: string, state: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  error?: string;
}

export function CityAutocomplete({
  value,
  stateFilter,
  onChange,
  onSelectCity,
  onBlur,
  placeholder = 'Start typing city (e.g. Delhi, Pune, Indore)...',
  required = false,
  disabled = false,
  className = '',
  style,
  id,
  error,
}: CityAutocompleteProps) {
  const autoId = useId();
  const inputId = id || `city-${autoId}`;
  const listboxId = `${inputId}-listbox`;
  const errorId = `${inputId}-error`;

  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [suggestions, setSuggestions] = useState<IndianCityOption[]>(
    INDIAN_CITIES_WITH_STATE.slice(0, 12)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const q = (value || '').trim();
    const st = (stateFilter || '').trim();
    let active = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ type: 'cities', q });
      if (st) params.set('state', st);
      fetch(`/api/storefront/locations?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data || !Array.isArray(data.cities)) return;
          if (data.cities.length > 0) {
            setSuggestions(data.cities);
          } else {
            const localLower = q.toLowerCase();
            const fallback = INDIAN_CITIES_WITH_STATE.filter(
              (c) => c.city.toLowerCase().includes(localLower) || c.state.toLowerCase().includes(localLower)
            ).slice(0, 12);
            setSuggestions(fallback);
          }
        })
        .catch(() => {
          // Keep current suggestions
        });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value, stateFilter]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [suggestions.length]);

  const chooseOption = (opt: IndianCityOption) => {
    onChange(opt.city);
    onSelectCity?.(opt.city, opt.state);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          open && suggestions[highlightIdx] ? `${listboxId}-opt-${highlightIdx}` : undefined
        }
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="address-level2"
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={className}
        style={{
          ...(error ? { borderColor: '#dc2626' } : {}),
          ...style,
        }}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            onBlur?.();
          }, 150);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }
          if (!open || suggestions.length === 0) return;

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx((i) => (i + 1) % suggestions.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === 'Enter') {
            const chosen = suggestions[highlightIdx];
            if (chosen) {
              e.preventDefault();
              chooseOption(chosen);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
            zIndex: 999,
            margin: 0,
            padding: '4px',
            listStyle: 'none',
          }}
        >
          {suggestions.map((item, idx) => {
            const active = idx === highlightIdx;
            return (
              <li
                key={`${item.city}-${item.state}-${idx}`}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  chooseOption(item);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  backgroundColor: active ? '#f1f5f9' : 'transparent',
                  color: '#0f172a',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <MapPin size={13} style={{ color: '#e2231a', flexShrink: 0 }} />
                  {item.city}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{item.state}</span>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#dc2626', fontWeight: 500 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
