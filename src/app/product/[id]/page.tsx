'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  TINT_OPTIONS,
  SAMPLE_REVIEWS,
  CATEGORIES_LIST,
  formatINR,
  isCustomFit,
} from '@/data/products';
import type { Product, ProductTintOption } from '@/data/products';
import { CatalogState } from '@/components/CatalogState';
import { ProductArt } from '@/components/ProductArt';
import { Footer } from '@/components/Footer';

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { products, catalogStatus, catalogError, retryCatalog } = useApp();

  const product = useMemo(() => products.find((p) => p.id === id), [id, products]);

  if (!product) {
    return (
      <div className="in-shop">
        <section className="pp on" id="v-prod">
          <div className="wrap">
            {catalogStatus === 'ready' ? (
              <div className="empty on">
                <b>Product unavailable</b>
                This product is not part of the current storefront catalog.
                <br />
                <br />
                <Link className="btn dark" href="/shop">
                  Browse products
                </Link>
              </div>
            ) : (
              <CatalogState
                status={catalogStatus}
                error={catalogError}
                onRetry={retryCatalog}
              />
            )}
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return <ProductDetailContent key={product.id} product={product} />;
}

function ProductDetailContent({ product }: { product: Product }) {
  const router = useRouter();
  const {
    car,
    addToCart,
    openCart,
    toggleFav,
    isFav,
    showToast,
    products,
  } = useApp();

  const activeCar = useMemo(() => {
    return car || { b: 'Hyundai', m: 'Creta', y: '2024', f: 'Petrol' };
  }, [car]);

  const [activeView, setActiveView] = useState(0);
  const tintOptions = product.tintOptions?.length ? product.tintOptions : TINT_OPTIONS;
  const [activeTint, setActiveTint] = useState<ProductTintOption>(tintOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [deliveryMsg, setDeliveryMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'d' | 's' | 'f' | 'i'>('d');

  const custom = isCustomFit(product);
  const discountPercent = product.o
    ? Math.round((1 - product.p / product.o) * 100)
    : 0;

  const categoryLabel =
    product.categoryLabel || CATEGORIES_LIST.find((c) => c[0] === product.c)?.[1] || 'Accessories';

  // Bought together bundle items
  const bundleItems = useMemo(() => {
    const others = products.filter((x) => x.id !== product.id && x.c !== product.c)
      .sort((a, b) => b.rv - a.rv)
      .slice(0, 2);
    return [product, ...others];
  }, [product, products]);

  const bundleTotal = bundleItems.reduce((acc, curr) => acc + curr.p, 0);

  // Related products
  const relatedProducts = useMemo(() => {
    return products.filter((x) => x.id !== product.id && x.c === product.c)
      .concat(products.filter((x) => x.id !== product.id && x.c !== product.c))
      .slice(0, 4);
  }, [product, products]);

  // Rating distribution
  const p5 = Math.max(50, Math.min(92, Math.round(60 + (product.r - 4.3) * 50)));
  const rs = 100 - p5;
  const p4 = Math.round(rs * 0.6);
  const p3 = Math.round(rs * 0.25);
  const p2 = Math.round(rs * 0.1);
  const dist = [p5, p4, p3, p2, Math.max(0, rs - p4 - p3 - p2)];

  const handleCheckPincode = () => {
    if (/^\d{6}$/.test(pincode.trim())) {
      const d = new Date(Date.now() + 4 * 864e5);
      setDeliveryMsg(
        'Delivery by ' +
          d.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }) +
          ' to ' +
          pincode
      );
    } else {
      setDeliveryMsg('Enter a valid 6-digit pincode');
    }
  };

  const handleAddBundle = () => {
    bundleItems.forEach((item) => addToCart(item.id, 1));
    openCart();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 's':
        return (
          <ul>
            {product.sp.map(([key, val], idx) => (
              <li key={idx}>
                <span>{key}</span>
                <b>{val}</b>
              </li>
            ))}
          </ul>
        );
      case 'f':
        return custom ? (
          <div>
            <p>
              Custom-cut for your <b>{activeCar.y} {activeCar.b} {activeCar.m}</b> ({activeCar.f}) from a laser-measured template.
            </p>
            <p>Changing vehicle updates fitment across the whole store.</p>
          </div>
        ) : (
          <div>
            <p>
              <b>Universal fit.</b> Works with your {activeCar.m} and most other cars.
            </p>
          </div>
        );
      case 'i':
        return (
          <div>
            <p>1. Unbox and lay the parts out on a clean surface.</p>
            <p>2. Position the product and check alignment against your seats, floor or wheel.</p>
            <p>3. Secure the straps or clips and give it a firm tug. No tools needed.</p>
          </div>
        );
      case 'd':
      default:
        return (
          <div>
            <p>{product.d}</p>
            <p style={{ marginTop: '8px' }}>
              Backed by our 2-year warranty and 30-day returns.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="in-shop">
      <section className="pp on" id="v-prod">
        <div className="wrap">
          {/* Mobile Bottom Bar */}
          <div className="pp-mb">
            <b>{formatINR(product.p)}</b>
            <button
              onClick={() => {
                addToCart(product.id, quantity);
                openCart();
              }}
            >
              Add to cart
            </button>
          </div>

          {/* Breadcrumbs */}
          <div className="pp-bc">
            <Link href="/shop">Shop</Link>/
            <Link href={`/shop?cat=${product.c}`}>{categoryLabel}</Link>/
            <b>{product.n}</b>
          </div>

          {/* Main 2-column Product Grid */}
          <div className="pp-g">
            {/* Left Gallery */}
            <div
              className="pp-gal"
              id="ppGal"
              style={{ ['--tint' as any]: activeTint[1] }}
            >
              <div className="pp-st" id="ppSt" data-v={activeView}>
                <ProductArt product={product} />
              </div>
              <div className="pp-th">
                {[0, 1, 2, 3].map((v) => (
                  <button
                    key={v}
                    className={activeView === v ? 'on' : ''}
                    onClick={() => setActiveView(v)}
                    aria-label={`View ${v + 1}`}
                  >
                    <ProductArt product={product} />
                  </button>
                ))}
              </div>
            </div>

            {/* Right Product Details */}
            <div className="pp-i">
              <span className="mono red">
                {product.s} series · CX-{String(product.id).padStart(2, '0')}
              </span>
              <h1 className="disp">{product.n}</h1>
              <div className="pp-r">
                <b>★★★★★</b> {product.r} ·{' '}
                <a
                  href="#ppRv"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('ppRv')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {product.rv} reviews
                </a>
              </div>

              <div className="pp-pr">
                <strong>{formatINR(product.p)}</strong>
                {product.o && (
                  <>
                    <s>{formatINR(product.o)}</s>
                    <em>{discountPercent}% off</em>
                  </>
                )}
              </div>
              <p className="gr-s">
                Inclusive of all taxes · or {formatINR(Math.round(product.p / 6))}/mo for 6 months, no-cost EMI
              </p>

              <div className={`pp-fit ${custom ? '' : 'u'}`}>
                <i />
                {custom
                  ? `Custom fit for your ${activeCar.y} ${activeCar.b} ${activeCar.m}`
                  : `Universal — works with your ${activeCar.m}`}
              </div>

              <p className="pp-lb">
                Stitch colour: <span>{activeTint[0]}</span>
              </p>
              <div className="pp-sw">
                {tintOptions.map((t, i) => (
                  <button
                    key={i}
                    title={t[0]}
                    className={activeTint[0] === t[0] ? 'on' : ''}
                    style={{ background: t[2] }}
                    onClick={() => setActiveTint(t)}
                    aria-label={t[0]}
                  />
                ))}
              </div>

              <div className="pp-buy">
                <div className="pp-q">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(9, q + 1))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  className="a"
                  onClick={() => {
                    addToCart(product.id, quantity);
                    openCart();
                  }}
                >
                  Add to cart
                </button>
                <button
                  className="b"
                  onClick={() => {
                    addToCart(product.id, quantity);
                    router.push('/checkout');
                  }}
                >
                  Buy now
                </button>
                <button
                  className={`hrt ${isFav(product.id) ? 'on' : ''}`}
                  onClick={() => toggleFav(product.id)}
                  aria-label="Favourite"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9z" />
                  </svg>
                </button>
              </div>

              <p className="pp-lb">Delivery</p>
              <div className="pp-pin">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
                <button onClick={handleCheckPincode}>Check</button>
              </div>
              {deliveryMsg && (
                <p className="gr-s" style={{ marginTop: '8px' }}>
                  {deliveryMsg}
                </p>
              )}

              <div className="pp-of">
                <span>
                  <b>Bank offer:</b> 10% off up to ₹750 on card payments
                </span>
                <span>
                  <b>Free shipping</b> on orders over ₹1,499
                </span>
              </div>

              <div className="pp-tr">
                <div>2-year warranty</div>
                <div>30-day returns</div>
                <div>Secure payments</div>
              </div>
            </div>
          </div>

          {/* Interactive Information Tabs */}
          <div className="pp-tabs" id="ppTabs">
            {[
              ['d', 'Description'],
              ['s', 'Specifications'],
              ['f', 'Fitment'],
              ['i', 'Installation'],
            ].map(([k, label]) => (
              <button
                key={k}
                className={`pill ${activeTab === k ? 'on' : ''}`}
                onClick={() => setActiveTab(k as any)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="pp-pane">{renderTabContent()}</div>

          {/* Bought Together Bundle */}
          <h2 className="disp pp-h">Bought together</h2>
          <div className="pp-fbt">
            {bundleItems.map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <span className="pp-pl">+</span>}
                <div className="pp-ft">
                  <div>
                    <ProductArt product={item} />
                  </div>
                  {item.n}
                  <br />
                  <span style={{ fontWeight: 500, color: 'var(--steel)' }}>
                    {formatINR(item.p)}
                  </span>
                </div>
              </React.Fragment>
            ))}
            <div className="pp-ftt">
              <b>{formatINR(bundleTotal)}</b>
              <button className="btn" onClick={handleAddBundle}>
                Add all 3
              </button>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <h2 className="disp pp-h" id="ppRv">
            Reviews
          </h2>
          <div className="pp-rv">
            <div className="pp-sum">
              <b className="disp">{product.r}</b>
              <span className="st">★★★★★</span>
              <p className="gr-s" style={{ marginBottom: '12px' }}>
                {product.rv} verified reviews
              </p>
              {dist.map((d, i) => (
                <div className="pp-bar" key={i}>
                  <span>{5 - i}★</span>
                  <i>
                    <b style={{ width: `${d}%` }} />
                  </i>
                  <span>{d}%</span>
                </div>
              ))}
              <button
                className="btn dark"
                style={{ marginTop: '14px' }}
                onClick={() => showToast('Demo storefront — review submitted successfully')}
              >
                Write a review
              </button>
            </div>

            <div>
              {[0, 1, 2, 3].map((k) => {
                const r = SAMPLE_REVIEWS[(product.id + k) % SAMPLE_REVIEWS.length];
                const s = k === 2 ? 4 : 5;
                return (
                  <div className="pp-rc" key={k}>
                    <div className="pp-rh">
                      <b>{r[0]}</b>
                      <span>Verified buyer</span>
                    </div>
                    <span className="st">
                      {'★'.repeat(s) + '☆'.repeat(5 - s)}
                    </span>
                    <h4>{r[1]}</h4>
                    <p>{r[2]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Related Products */}
          <h2 className="disp pp-h">You may also like</h2>
          <div className="pp-sim">
            <div className="grid">
              {relatedProducts.map((p) => {
                const isCustom = isCustomFit(p);
                return (
                  <article key={p.id} className="pc">
                    <div
                      className="pm"
                      onClick={() => router.push(`/product/${p.id}`)}
                    >
                      <ProductArt product={p} />
                      <span className={`fitb ${isCustom ? '' : 'u'}`}>
                        {isCustom ? `✓ Fits your ${activeCar.m}` : 'Universal fit'}
                      </span>
                      <span className="qv">View details</span>
                      {p.top && <span className="top-b">Top item</span>}
                      {p.nw && <span className="top-b new-b">New</span>}
                    </div>

                    <button
                      className={`hrt ${isFav(p.id) ? 'on' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(p.id);
                      }}
                      aria-label="Favourite"
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M12 20s-7-4.6-9-9A5.2 5.2 0 0 1 12 6.4 5.2 5.2 0 0 1 21 11c-2 4.4-9 9-9 9z" />
                      </svg>
                    </button>

                    <div className="pi">
                      <h3 onClick={() => router.push(`/product/${p.id}`)}>
                        {p.n}
                      </h3>
                      <div className="rt">
                        <b>★</b> {p.r} · {p.rv} reviews
                      </div>
                      <div className="pr">
                        {p.o && <s>{formatINR(p.o)}</s>}
                        <button
                          className="buy"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(p.id, 1);
                            openCart();
                          }}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M6 8h12l1 12H5L6 8z" />
                            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                          </svg>
                          {formatINR(p.p)}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
