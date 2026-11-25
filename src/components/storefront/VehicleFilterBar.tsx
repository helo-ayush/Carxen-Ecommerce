'use client';

import React, { useState } from 'react';
import { CarFront, Globe, RotateCcw, Sparkles } from 'lucide-react';
import {
  VehicleMakeAutocomplete,
  VehicleModelAutocomplete,
  type VehicleCatalogModelOption,
} from '@/components/ui/VehicleAutocomplete';
import { getYearsForRange } from '@/data/indian-vehicles-master';
import type { GarageVehicle } from '@/lib/storefront/fitment';

export interface VehicleFilterState {
  brand: string;
  model: string;
  year: string;
  fuel: string;
}

export interface VehicleFilterBarProps {
  value: VehicleFilterState;
  onChange: (next: VehicleFilterState) => void;
  includeUniversal?: boolean;
  onToggleUniversal?: (next: boolean) => void;
  activeGarageCar?: GarageVehicle | null;
  title?: string;
}

export function VehicleFilterBar({
  value,
  onChange,
  includeUniversal = true,
  onToggleUniversal,
  activeGarageCar,
  title = 'Filter by Vehicle',
}: VehicleFilterBarProps) {
  const [modelMeta, setModelMeta] = useState<VehicleCatalogModelOption | null>(null);

  const hasSelection = Boolean(value.brand || value.model || value.year || value.fuel);
  const years = getYearsForRange(modelMeta?.yearFrom, modelMeta?.yearTo);
  const fuels = modelMeta?.fuels?.length
    ? modelMeta.fuels
    : ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

  const inputStyle: React.CSSProperties = {
    height: '38px',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #d4d4d8',
    padding: '0 10px',
    fontSize: '13px',
    color: '#09090b',
    background: '#ffffff',
    outline: 'none',
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e4e4e7',
        borderRadius: '12px',
        padding: '12px 14px',
        marginBottom: '14px',
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 700, color: '#18181b' }}>
          <CarFront size={15} style={{ color: '#e11d48' }} />
          <span>{title}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          {activeGarageCar && (activeGarageCar.b || activeGarageCar.m) && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  brand: activeGarageCar.b || '',
                  model: activeGarageCar.m || '',
                  year: activeGarageCar.y || '',
                  fuel: activeGarageCar.f || '',
                })
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid #fecdd3',
                background: '#fff1f2',
                color: '#be123c',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={12} />
              My Car: {[activeGarageCar.b, activeGarageCar.m, activeGarageCar.y].filter(Boolean).join(' ')}
            </button>
          )}

          {onToggleUniversal && (
            <button
              type="button"
              onClick={() => onToggleUniversal(!includeUniversal)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '999px',
                border: `1px solid ${includeUniversal ? '#a7f3d0' : '#e4e4e7'}`,
                background: includeUniversal ? '#ecfdf5' : '#f4f4f5',
                color: includeUniversal ? '#047857' : '#52525b',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Globe size={12} />
              {includeUniversal ? 'Universal Fit Included' : 'Exact Vehicle Fit Only'}
            </button>
          )}

          {hasSelection && (
            <button
              type="button"
              onClick={() => {
                setModelMeta(null);
                onChange({ brand: '', model: '', year: '', fuel: '' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                borderRadius: '999px',
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                color: '#52525b',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        style={{ gap: '8px' }}
      >
        <VehicleMakeAutocomplete
          value={value.brand}
          style={inputStyle}
          placeholder="Make / Brand (e.g. Maruti Suzuki)..."
          onChange={(brand) => {
            if (brand !== value.brand) setModelMeta(null);
            onChange({ ...value, brand });
          }}
          onSelectMake={(brand) => {
            setModelMeta(null);
            onChange({ brand, model: '', year: '', fuel: '' });
          }}
        />

        <VehicleModelAutocomplete
          make={value.brand}
          value={value.model}
          style={inputStyle}
          placeholder={value.brand ? `Search ${value.brand} model...` : 'Model (select brand first)...'}
          onChange={(model) => onChange({ ...value, model })}
          onSelectModel={(opt) => {
            setModelMeta(opt);
            onChange({
              ...value,
              model: opt.model,
              year: value.year && years.includes(value.year) ? value.year : '',
              fuel: value.fuel && opt.fuels.includes(value.fuel) ? value.fuel : '',
            });
          }}
          onCatalogLoaded={(models) => {
            const match = models.find((m) => m.model.toLowerCase() === value.model.trim().toLowerCase());
            if (match) setModelMeta(match);
          }}
        />

        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value })}
          style={inputStyle}
          aria-label="Filter by vehicle year"
        >
          <option value="">All Years</option>
          {years.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>

        <select
          value={value.fuel}
          onChange={(e) => onChange({ ...value, fuel: e.target.value })}
          style={inputStyle}
          aria-label="Filter by vehicle fuel"
        >
          <option value="">All Fuels</option>
          {fuels.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
