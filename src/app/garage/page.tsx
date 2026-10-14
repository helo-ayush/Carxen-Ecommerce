'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { VEHICLES } from '@/data/products';

export default function GaragePage() {
  const router = useRouter();
  const { car, setVehicle } = useApp();

  const [brand, setBrand] = useState(car?.b || '');
  const [model, setModel] = useState(car?.m || '');
  const [year, setYear] = useState(car?.y || '');
  const [fuel, setFuel] = useState(car?.f || 'Petrol');

  const models = brand ? VEHICLES[brand] || [] : [];
  const years = Array.from({ length: 9 }, (_, i) => String(2026 - i));
  const fuels = ['Petrol', 'Diesel', 'CNG', 'Electric'];

  const stepCount = (brand ? 1 : 0) + (model ? 1 : 0) + (year ? 1 : 0);
  const isComplete = !!(brand && model && year);

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
          {Object.keys(VEHICLES).map((b) => (
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
        <svg className="gr-car" viewBox="50 96 740 180">
          <path d="M78 262V224Q80 202 108 196L176 184Q214 132 292 122L486 112Q560 112 616 148L676 168Q756 176 766 208L768 262" />
          <path d="M196 262Q196 200 258 200T320 262M560 262Q560 200 622 200T684 262M236 178Q268 140 320 134L470 126Q530 128 578 158L596 172L470 176" />
          <circle className="rd" cx="258" cy="240" r="34" />
          <circle className="rd" cx="622" cy="240" r="34" />
        </svg>

        <div>
          <p className="gr-vb">{brand || 'Select your brand'}</p>
          <h3 className="disp">{model || 'Your car'}</h3>
          <p className="gr-vb">
            {model ? `${year || 'Year'} · ${fuel}` : 'Choose brand, model and year'}
          </p>

          <div className="gr-n">
            <b>12</b>
            <span>parts · 6 custom-fit, 6 universal</span>
          </div>

          <button
            className="btn mag"
            disabled={!isComplete}
            onClick={handleSave}
          >
            Show my accessories{' '}
            <svg viewBox="0 0 24 24">
              <path d="M4 12h16M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
