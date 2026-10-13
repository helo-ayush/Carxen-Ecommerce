'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatINR } from '@/data/products';
import { loadStorefrontOrder } from '@/lib/storefront/order-client';
import type { StorefrontOrderSnapshot } from '@/lib/storefront/order-types';
import { Footer } from '@/components/Footer';

type OrderLoadState = 'loading' | 'ready' | 'empty' | 'error';

function humanizeStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPlacedAt(placedAt: string | null) {
  if (!placedAt) return 'just now';

  const date = new Date(placedAt);
  if (Number.isNaN(date.getTime())) return 'just now';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function OrderItemSnapshotArt({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 320 200" aria-label={`${name} product snapshot`} role="img">
      <rect x="66" y="45" width="188" height="110" rx="28" fill="#242429" />
      <path d="M94 75h132M92 122h136" stroke="#e2231a" strokeWidth="10" strokeLinecap="round" />
      <path d="M120 45v110M200 45v110" stroke="#fff" strokeOpacity=".16" strokeWidth="5" />
    </svg>
  );
}

function OrderState({
  title,
  message,
  role = 'status',
  onRetry,
  showContinue = false,
}: {
  title: string;
  message: string;
  role?: 'status' | 'alert';
  onRetry?: () => void;
  showContinue?: boolean;
}) {
  return (
    <div className="pg-ok" role={role}>
      <h1 className="disp pg-t">{title}</h1>
      <p className="gr-s">{message}</p>
      {onRetry ? (
        <button className="btn dark" type="button" onClick={onRetry} style={{ marginTop: '24px' }}>
          Try again
        </button>
      ) : null}
      {showContinue ? (
        <div style={{ marginTop: '24px' }}>
          <Link className="btn" href="/shop">
            Continue shopping
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function OrderPage() {
  const params = useParams();
  const rawOrderNumber = params?.id;
  const orderNumber = Array.isArray(rawOrderNumber) ? rawOrderNumber[0] : rawOrderNumber;
  const [order, setOrder] = useState<StorefrontOrderSnapshot | null>(null);
  const [loadState, setLoadState] = useState<OrderLoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const loadOrder = useCallback(
    async (signal: AbortSignal) => {
      if (!orderNumber) {
        setOrder(null);
        setLoadError(null);
        setLoadState('empty');
        return;
      }

      setLoadState('loading');
      setLoadError(null);

      try {
        const serverOrder = await loadStorefrontOrder(orderNumber, signal);
        if (signal.aborted) return;

        if (!serverOrder) {
          setOrder(null);
          setLoadState('empty');
          return;
        }

        setOrder(serverOrder);
        setLoadState('ready');
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;

        setOrder(null);
        setLoadError(error instanceof Error ? error.message : 'The order could not be loaded.');
        setLoadState('error');
      }
    },
    [orderNumber],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadOrder(controller.signal);
    return () => controller.abort();
  }, [loadOrder, retryToken]);

  const paymentLabel =
    order && order.paymentStatus.toLowerCase() === 'pending'
      ? 'Payment pending'
      : order
      ? `Payment ${humanizeStatus(order.paymentStatus)}`
      : '';

  return (
    <div className="in-shop">
      <section className="pp on" id="v-pg">
        <div className="wrap" id="pgIn">
          {loadState === 'loading' ? (
            <OrderState title="Loading order" message="Fetching the saved order from the storefront." />
          ) : loadState === 'error' ? (
            <OrderState
              title="Order unavailable"
              message={loadError || 'We could not load this saved order right now.'}
              role="alert"
              onRetry={() => setRetryToken((token) => token + 1)}
            />
          ) : loadState === 'empty' || !order ? (
            <OrderState
              title="Order not found"
              message="We couldn’t find a saved order for this order number."
              showContinue
            />
          ) : (
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
                Order #{order.orderNumber} · {paymentLabel} · placed {formatPlacedAt(order.placedAt)}
              </p>

              <div
                className="ck-b"
                style={{ maxWidth: '520px', margin: '24px auto', textAlign: 'left' }}
              >
                {order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div className="ck-i" key={`${item.productId}-${item.productSlug || item.name}`}>
                      <div>
                        <OrderItemSnapshotArt name={item.name} />
                      </div>
                      <strong style={{ flex: 1, fontWeight: 600, lineHeight: 1.35 }}>
                        {item.name} × {item.quantity}
                        <small style={{ display: 'block', fontWeight: 400, marginTop: '3px' }}>
                          {formatINR(item.unitPrice)} each
                        </small>
                      </strong>
                      <span>{formatINR(item.lineSubtotal)}</span>
                    </div>
                  ))
                ) : (
                  <p className="gr-s">No line items were returned for this order.</p>
                )}

                <div className="ck-r">
                  <span>Subtotal</span>
                  <span>{formatINR(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 ? (
                  <div className="ck-r g">
                    <span>Discount</span>
                    <span>−{formatINR(order.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="ck-r">
                  <span>Shipping</span>
                  <span>{order.shippingAmount ? formatINR(order.shippingAmount) : 'Free'}</span>
                </div>
                <div className="ck-r t">
                  <span>Total</span>
                  <span>{formatINR(order.totalAmount)}</span>
                </div>
                <p className="gr-s" style={{ margin: '14px 0 0', fontSize: '12px' }}>
                  Fulfilment: {humanizeStatus(order.fulfillmentStatus)} · payment capture is still pending.
                </p>
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
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
