'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

export const ALL_INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export interface StateAutocompleteProps {
  value: string;
  onChange: (state: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  error?: string;
}

export function StateAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = 'Select or type State / UT...',
  required = false,
  disabled = false,
  className = '',
  style,
  id,
  error,
}: StateAutocompleteProps) {
  const autoId = useId();
  const inputId = id || `state-${autoId}`;
  const listboxId = `${inputId}-listbox`;
  const errorId = `${inputId}-error`;

  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return ALL_INDIAN_STATES;
    const startsWith = ALL_INDIAN_STATES.filter((s) => s.toLowerCase().startsWith(q));
    const includes = ALL_INDIAN_STATES.filter(
      (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q)
    );
    return [...startsWith, ...includes];
  }, [value]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [suggestions.length]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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
        autoComplete="address-level1"
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
              onChange(chosen);
              setOpen(false);
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
          {suggestions.map((stateName, idx) => {
            const active = idx === highlightIdx;
            return (
              <li
                key={stateName}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(stateName);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  backgroundColor: active ? '#f1f5f9' : 'transparent',
                  color: '#0f172a',
                }}
              >
                {stateName}
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
