'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/products';
import { ProductArt } from './ProductArt';

export function QuickViewModal() {
  const { quickViewProduct, closeQuickView, addToCart, openCart } = useApp();

  if (!quickViewProduct) return null;

  const p = quickViewProduct;

  const handleAdd = () => {
    addToCart(p.id, 1);
    closeQuickView();
    openCart();
  };

  return (
    <>
      <div className="scrim on" onClick={closeQuickView} />
      <div className="qvm on" id="qvm" role="dialog" aria-modal="true" onClick={(e) => {
        if (e.target === e.currentTarget) closeQuickView();
      }}>
        <div className="qvc">
          <button className="xb qvx" id="qx" onClick={closeQuickView} aria-label="Close">
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="qvi" id="qi">
            <ProductArt product={p} style={{ width: '80%', maxHeight: '80%' }} />
          </div>
          <div className="qvb">
            <span className="cd" id="qc">
              {`CX-${String(p.id).padStart(2, '0')} / ${p.c} / ${p.s}`}
            </span>
            <h3 id="qn">{p.n}</h3>
            <span className="pz" id="qp">
              {formatINR(p.p)}{' '}
              {p.o ? (
                <s style={{ color: 'var(--mute)', fontSize: '15px', fontWeight: 500 }}>
                  {formatINR(p.o)}
                </s>
              ) : null}
            </span>
            <p id="qd">{p.d}</p>
            <ul id="qs">
              {p.sp.map(([key, val], idx) => (
                <li key={idx}>
                  <span>{key}</span>
                  <span>{val}</span>
                </li>
              ))}
            </ul>
            <button className="btn" id="qa" onClick={handleAdd}>
              Add to cart
              <svg viewBox="0 0 24 24">
                <path d="M4 12h16M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
