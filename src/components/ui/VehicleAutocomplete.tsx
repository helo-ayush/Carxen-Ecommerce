'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { CarFront, ChevronDown, Loader2 } from 'lucide-react';
import {
  INDIAN_VEHICLES_MASTER,
  type VehicleMasterModel,
} from '@/data/indian-vehicles-master';

export type VehicleCatalogModelOption = VehicleMasterModel;

const LOCAL_MAKES = Object.keys(INDIAN_VEHICLES_MASTER);

export interface VehicleMakeAutocompleteProps {
  value: string;
  onChange: (make: string) => void;
  onSelectMake?: (make: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export function VehicleMakeAutocomplete({
  value,
  onChange,
  onSelectMake,
  placeholder = 'Search brand (e.g. Maruti Suzuki, Hyundai, BMW)...',
  required = false,
  disabled = false,
  className = '',
  style,
  id,
}: VehicleMakeAutocompleteProps) {
  const autoId = useId();
  const inputId = id || `veh-make-${autoId}`;
  const listboxId = `${inputId}-listbox`;

  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>(LOCAL_MAKES);
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
    let active = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ type: 'makes', q });
      fetch(`/api/storefront/vehicles/catalog?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data || !Array.isArray(data.makes)) return;
          setSuggestions(data.makes);
        })
        .catch(() => {
          const ql = q.toLowerCase();
          setSuggestions(
            ql ? LOCAL_MAKES.filter((m) => m.toLowerCase().includes(ql)) : LOCAL_MAKES
          );
        });
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [suggestions.length]);

  const chooseOption = (make: string) => {
    onChange(make);
    onSelectMake?.(make);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
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
          autoComplete="off"
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={className}
          style={{ paddingRight: '32px', ...style }}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
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
        <ChevronDown
          size={15}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#71717a',
            pointerEvents: 'none',
          }}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '220px',
            maxWidth: 'calc(100vw - 24px)',
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
          {suggestions.map((make, idx) => {
            const active = idx === highlightIdx;
            return (
              <li
                key={make}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  chooseOption(make);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  background: active ? '#f4f4f5' : 'transparent',
                  color: '#18181b',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <CarFront size={13} style={{ color: '#e11d48', flexShrink: 0 }} />
                  <span>{make}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export interface VehicleModelAutocompleteProps {
  make: string;
  value: string;
  onChange: (model: string) => void;
  onSelectModel?: (option: VehicleCatalogModelOption) => void;
  onCatalogLoaded?: (models: VehicleCatalogModelOption[], source: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export function VehicleModelAutocomplete({
  make,
  value,
  onChange,
  onSelectModel,
  onCatalogLoaded,
  placeholder = 'Search model (e.g. Swift, Creta, Nexon, 3 Series)...',
  required = false,
  disabled = false,
  className = '',
  style,
  id,
}: VehicleModelAutocompleteProps) {
  const autoId = useId();
  const inputId = id || `veh-model-${autoId}`;
  const listboxId = `${inputId}-listbox`;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [suggestions, setSuggestions] = useState<VehicleCatalogModelOption[]>([]);
  const [catalogSource, setCatalogSource] = useState<string>('none');
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
    const mk = (make || '').trim();
    const q = (value || '').trim();
    if (!mk) {
      setSuggestions([]);
      setCatalogSource('none');
      return;
    }

    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ type: 'models', make: mk, q });
      fetch(`/api/storefront/vehicles/catalog?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data || !Array.isArray(data.models)) return;
          setSuggestions(data.models);
          setCatalogSource(data.source || 'none');
          onCatalogLoaded?.(data.models, data.source || 'none');
        })
        .catch(() => {
          // Keep current suggestions on transient error
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [make, value]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [suggestions.length]);

  const chooseOption = (opt: VehicleCatalogModelOption) => {
    onChange(opt.model);
    onSelectModel?.(opt);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
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
          autoComplete="off"
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={className}
          style={{ paddingRight: '32px', ...style }}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
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
        {loading ? (
          <Loader2
            size={15}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#71717a',
              animation: 'spin 1s linear infinite',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <ChevronDown
            size={15}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#71717a',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '240px',
            maxWidth: 'calc(100vw - 24px)',
            width: '100%',
            maxHeight: '250px',
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
          {catalogSource === 'nhtsa_vpic' && (
            <li
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                color: '#71717a',
                borderBottom: '1px solid #f4f4f5',
                marginBottom: '2px',
              }}
            >
              Global NHTSA vPIC catalog for {make}
            </li>
          )}
          {suggestions.map((item, idx) => {
            const active = idx === highlightIdx;
            const yearLabel = `${item.yearFrom}–${item.yearTo ?? 'Present'}`;
            return (
              <li
                key={`${item.model}-${idx}`}
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
                  cursor: 'pointer',
                  fontSize: '13px',
                  background: active ? '#f4f4f5' : 'transparent',
                  color: '#18181b',
                }}
              >
                <span style={{ fontWeight: active ? 600 : 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.model}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#71717a',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {yearLabel}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
