'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { fitsVehicle } from '@/lib/storefront/fitment';

export default function GaragePage() {
  const router = useRouter();
  const { car, setVehicle, vehicleBrands, getModelsForBrand, storefrontConfig, products } = useApp();

  const [brand, setBrand] = useState(car?.b || '');
  const [model, setModel] = useState(car?.m || '');
  const [year, setYear] = useState(car?.y || '');
  const [fuel, setFuel] = useState(car?.f || 'Petrol');

  const fitmentConfig = storefrontConfig?.fitment;
  const fitmentImage =
    fitmentConfig?.image ||
    'https://images.unsplash.com/photo-1625690180114-5530b1304127?auto=format&fit=crop&w=1200&q=85';

  const models = brand ? getModelsForBrand(brand) : [];
  const years = Array.from({ length: 9 }, (_, i) => String(2026 - i));
  const fuels = ['Petrol', 'Diesel', 'CNG', 'Electric'];

  const stepCount = (brand ? 1 : 0) + (model ? 1 : 0) + (year ? 1 : 0);
  const isComplete = !!(brand && model && year);

  const currentVehicle = useMemo(
    () => ({
      b: brand || null,
      m: model || null,
      y: year || null,
      f: fuel || null,
    }),
    [brand, model, year, fuel]
  );

  const matchingStats = useMemo(() => {
    if (!products || products.length === 0) {
      return { total: 0, custom: 0, universal: 0 };
    }
    if (!model) {
      const custom = products.filter((p) => p.customFit !== false).length;
      const universal = products.length - custom;
      return { total: products.length, custom, universal };
    }
    let custom = 0;
    let universal = 0;
    for (const p of products) {
      if (fitsVehicle(p, currentVehicle)) {
        if (p.customFit !== false) {
          custom++;
        } else {
          universal++;
        }
      }
    }
    return { total: custom + universal, custom, universal };
  }, [products, model, currentVehicle]);

  const handleSave = () => {
    if (!isComplete) return;
    setVehicle({ b: brand, m: model, y: year, f: fuel });
    router.push('/shop');
  };

  return (
    <div className="gr-w">
      <div className="gr-p">
        <div className="gr-top">
          <Link href="/" className="logo logo-link" aria-label="CARXEN Homepage">
            <img src="/logo.png" alt="CARXEN" className="logo-img" style={{ height: '38px', width: 'auto' }} />
          </Link>
          <button className="xb" onClick={() => router.back()} aria-label="Close">
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <h2 className="disp">
          What do you drive<span className="red">?</span>
        </h2>
        <p className="gr-s">
          Pick your car once. We&apos;ll only show parts that fit it.
        </p>

        <div className="gr-steps">
          <i className={stepCount >= 1 ? 'on' : ''} />
          <i className={stepCount >= 2 ? 'on' : ''} />
          <i className={stepCount >= 3 ? 'on' : ''} />
        </div>

        <p className="gr-h">Brand</p>
        <div className="gr-brands">
          {vehicleBrands.map((b) => (
            <button
              key={b}
              className={`gr-t ${brand === b ? 'on' : ''}`}
              onClick={() => {
                setBrand(b);
                setModel('');
                setYear('');
              }}
            >
              <b>{b[0]}</b>
              {b}
            </button>
          ))}
        </div>

        <p className="gr-h">Model</p>
        <div className="gr-chips">
          {brand ? (
            models.map((m) => (
              <button
                key={m}
                className={`pill ${model === m ? 'on' : ''}`}
                onClick={() => {
                  setModel(m);
                  setYear('');
                }}
              >
                {m}
              </button>
            ))
          ) : (
            <p className="gr-hint">Pick a brand first.</p>
          )}
        </div>

        <p className="gr-h">Year</p>
        <div className="gr-chips">
          {model ? (
            years.map((y) => (
              <button
                key={y}
                className={`pill ${year === y ? 'on' : ''}`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))
          ) : (
            <p className="gr-hint">Pick a model first.</p>
          )}
        </div>

        <p className="gr-h">Fuel</p>
        <div className="gr-chips">
          {fuels.map((f) => (
            <button
              key={f}
              className={`pill ${fuel === f ? 'on' : ''}`}
              onClick={() => setFuel(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="gr-v">
        <div className="gr-visual-frame">
          <img
            src={fitmentImage}
            alt={fitmentConfig?.alt || (model ? `${brand} ${model} precision fitment` : 'Precision fit automotive interior')}
            className="gr-visual-img"
          />
          <div className="gr-visual-shade" />
          <div className="gr-visual-badge">
            <span className="gr-badge-dot" />
            <span>{model ? 'Precision Fit Guaranteed' : (fitmentConfig?.kicker || 'Precision Fitment')}</span>
          </div>
          {brand && (
            <div className="gr-visual-car-tag">
              <span>{brand}</span>
            </div>
          )}
        </div>

        <div className="gr-info-body">
          <div className="gr-model-meta">
            <span className="gr-brand-label">{brand || 'Vehicle Profile'}</span>
            <h3 className="gr-model-title">{model || 'Select Your Vehicle'}</h3>
            <div className="gr-spec-pills">
              {model ? (
                <>
                  <span className="gr-spec-chip">{year || 'All Years'}</span>
                  <span className="gr-spec-chip">{fuel}</span>
                  <span className="gr-spec-chip fit-verified">100% Fit Guaranteed</span>
                </>
              ) : (
                <span className="gr-spec-hint">Select brand, model, and year to see precision-fit parts</span>
              )}
            </div>
          </div>

          <div className="gr-parts-card">
            <div className="gr-parts-count-row">
              <span className="gr-parts-num">{matchingStats.total}</span>
              <div className="gr-parts-labels">
                <strong>{matchingStats.total === 1 ? 'Compatible Part' : 'Compatible Parts'}</strong>
                <span>{model ? `engineered for ${brand} ${model}` : 'in catalog'}</span>
              </div>
            </div>
            <div className="gr-parts-chips">
              <span className="gr-parts-chip custom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {matchingStats.custom} Custom-Fit
              </span>
              <span className="gr-parts-chip universal">
                {matchingStats.universal} Universal
              </span>
            </div>
          </div>

          <button
            className="btn mag gr-cta-btn"
            disabled={!isComplete}
            onClick={handleSave}
          >
            <span>Show my accessories</span>
            <svg viewBox="0 0 24 24">
              <path d="M4 12h16M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
