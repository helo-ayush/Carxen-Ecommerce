'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

type PostOfficeSuggestion = {
  name: string;
  district: string;
  state: string;
  pincode: string;
};

export interface PincodeAutocompleteProps {
  value: string;
  onChange: (pin: string) => void;
  onResolveLocation?: (city: string, state: string, locality?: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  error?: string;
}

export function PincodeAutocomplete({
  value,
  onChange,
  onResolveLocation,
  onBlur,
  placeholder = '6-digit PIN (e.g. 110006)',
  required = false,
  disabled = false,
  className = '',
  style,
  id,
  error,
}: PincodeAutocompleteProps) {
  const autoId = useId();
  const inputId = id || `pin-${autoId}`;
  const listboxId = `${inputId}-listbox`;
  const errorId = `${inputId}-error`;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState<string>('');
  const [suggestions, setSuggestions] = useState<PostOfficeSuggestion[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFetchedPin = useRef<string>('');

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
    const clean = (value || '').replace(/\D/g, '').slice(0, 6);
    if (!/^[1-9]\d{5}$/.test(clean)) {
      setSuggestions([]);
      setResolvedLabel('');
      return;
    }
    if (lastFetchedPin.current === clean) return;
    lastFetchedPin.current = clean;

    let active = true;
    setLoading(true);
    fetch(`/api/storefront/locations?type=pincode&pin=${clean}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const offices: PostOfficeSuggestion[] = Array.isArray(data.postOffices) ? data.postOffices : [];
        setSuggestions(offices);
        if (data.city && data.state) {
          setResolvedLabel(`${data.city}, ${data.state}`);
          onResolveLocation?.(data.city, data.state, offices[0]?.name);
        } else {
          setResolvedLabel('');
        }
      })
      .catch(() => {
        if (active) setSuggestions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [value, onResolveLocation]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        maxLength={6}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        autoComplete="postal-code"
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={className}
        style={{
          ...(error ? { borderColor: '#dc2626' } : {}),
          ...style,
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
          onChange(digits);
          if (digits.length === 6) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
            onBlur?.();
          }, 150);
        }}
        onKeyDown={(e) => {
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
              onResolveLocation?.(chosen.district || chosen.name, chosen.state, chosen.name);
              setResolvedLabel(`${chosen.district || chosen.name}, ${chosen.state}`);
              setOpen(false);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />

      {loading && (
        <div style={{ marginTop: '3px', fontSize: '11px', color: '#64748b' }}>
          Looking up PIN location...
        </div>
      )}
      {!loading && resolvedLabel && !error && (
        <div style={{ marginTop: '3px', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
          ✓ {resolvedLabel}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '280px',
            width: '100%',
            maxHeight: '240px',
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
          {suggestions.map((po, idx) => {
            const active = idx === highlightIdx;
            return (
              <li
                key={`${po.name}-${idx}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onResolveLocation?.(po.district || po.name, po.state, po.name);
                  setResolvedLabel(`${po.district || po.name}, ${po.state}`);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: active ? '#f1f5f9' : 'transparent',
                  color: '#0f172a',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <MapPin size={12} style={{ color: '#e2231a', flexShrink: 0 }} />
                  {po.name}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {po.district}, {po.state}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p id={errorId} role="alert" style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#dc2626', fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  );
}
