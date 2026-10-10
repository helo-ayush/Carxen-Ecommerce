'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PRODUCTS, formatINR } from '@/data/products';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params?.id);
  const { orders } = useApp();

  const order = orders.find((o) => o.id === orderId);

  return (
    <div className="in-shop">
      <section className="pp on" id="v-pg">
        <div className="wrap" id="pgIn">
          {order ? (
            <div className="pg-ok">
              <div className="ok-c">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                >
                  <path d="M5 12l5 5 9-10" />
                </svg>
              </div>
              <h1 className="disp pg-t">Order placed</h1>
              <p className="gr-s">
                Order #{order.id} · {order.pay} · arriving by {order.eta}
              </p>

              <div
                className="ck-b"
                style={{ maxWidth: '520px', margin: '24px auto', textAlign: 'left' }}
              >
                {order.items.map(([id, q]) => {
                  const p = PRODUCTS.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <div className="ck-i" key={id}>
                      <div>
                        <ProductArt product={p} />
                      </div>
                      {p.n} × {q}
                      <span>{formatINR(p.p * q)}</span>
                    </div>
                  );
                })}
                <div className="ck-r t">
                  <span>Total</span>
                  <span>{formatINR(order.total)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                <Link className="btn" href="/shop">
                  Continue shopping
                </Link>
                <Link className="btn dark" href="/account">
                  View orders
                </Link>
              </div>
            </div>
          ) : (
            <div className="pg-ok">
              <h1 className="disp pg-t">Order not found</h1>
              <p className="gr-s">We couldn&apos;t find this order in your current session.</p>
              <div style={{ marginTop: '24px' }}>
                <Link className="btn" href="/shop">
                  Continue shopping
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
