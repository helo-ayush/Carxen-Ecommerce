import React from 'react';

export type WholesaleIconName =
  | 'catalogue'
  | 'quick-order'
  | 'basket'
  | 'orders'
  | 'lists'
  | 'account'
  | 'shield'
  | 'warehouse'
  | 'spark'
  | 'truck'
  | 'tier'
  | 'package'
  | 'invoice'
  | 'check'
  | 'filter'
  | 'search'
  | 'phone';

const PATHS: Record<WholesaleIconName, React.ReactNode> = {
  // Layered Automotive Catalogue Binder
  catalogue: (
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v18H6.5a2.5 2.5 0 0 0-2.5 2.5v-3Z" />
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20" />
      <path d="M8 8h8M8 12h5" />
      <circle cx="16" cy="14" r="1.5" />
      <path d="M6.5 22H20" />
    </>
  ),

  // High-Speed Procurement Matrix (Grid + Lightning Bolt)
  'quick-order': (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" opacity="0.35" />
      <path d="M3 9h18M9 3v18" />
      <path
        d="m14 7-4.5 5.5h3L11 17l5-6h-3.2L14 7Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),

  // Procurement Tote / Bulk Basket
  basket: (
    <>
      <path d="M3.5 9h17l-1.4 9.4A2.5 2.5 0 0 1 16.6 21H7.4a2.5 2.5 0 0 1-2.5-2.6L3.5 9Z" />
      <path d="M8 9V6.5A3.5 3.5 0 0 1 11.5 3h1A3.5 3.5 0 0 1 16 6.5V9" />
      <path d="M9 13.5v3.5M15 13.5v3.5M12 13v4" />
    </>
  ),

  // Commercial Orders / Tracking Document
  orders: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6" />
      <path d="m9 15 2 2 4-4" />
      <path d="M9 10h2" />
    </>
  ),

  // Saved Assortments / Quotation Lists
  lists: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1.5" />
      <path d="m9 12 1.5 1.5L14 10M9 17l1.5 1.5L14 15" />
    </>
  ),

  // Enterprise Corporate Account & Verification
  account: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M13 10h6v11" />
      <path d="M8 10h2M8 14h2M8 18h2M16 14h1M16 18h1" />
      <circle cx="17.5" cy="5.5" r="3.5" />
      <path d="m16 5.5 1 1 2-2" />
    </>
  ),

  // CarXen Zero-Payment Commercial Guarantee Shield
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),

  // Modern Automotive Factory / Distribution Hub
  warehouse: (
    <>
      <path d="M3 21V9l6-4 6 4 6-4v16H3Z" />
      <path d="M9 21v-7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7" />
      <path d="M3 13h18" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </>
  ),

  // 4-Point AI Spark for Volume Margins
  spark: (
    <>
      <path d="M12 2v20M2 12h20" strokeOpacity="0.4" />
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
    </>
  ),

  // Priority Dispatch Freight Truck
  truck: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M14 9h4l3 4v4a1 1 0 0 1-1 1h-2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M9 18h6" />
    </>
  ),

  // Commercial Pricing Tier (Tier 1 / Tier 2 margin steps)
  tier: (
    <>
      <path d="M3 20h18" />
      <path d="M5 20v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5" />
      <path d="M13 20V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11" />
      <path d="m17 4-1.5 2.5h3L17 4Z" fill="currentColor" stroke="none" />
    </>
  ),

  // Master Factory Package
  package: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
      <path d="m7.5 5 8 4.5" />
    </>
  ),

  // GST Commercial Tax Invoice
  invoice: (
    <>
      <path d="M4 2v20l3-1.5 3 1.5 3-1.5 3 1.5 4-2V2H4Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),

  // Verification Check
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 5-5" />
    </>
  ),

  // Filter Funnel
  filter: (
    <>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </>
  ),

  // Optical Search
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),

  // Desk Phone / Hotline
  phone: (
    <>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
    </>
  ),
};

export function WholesaleIcon({
  name,
  size = 20,
  strokeWidth = 1.65,
  className,
}: {
  name: WholesaleIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {PATHS[name]}
    </svg>
  );
}

export function WholesaleMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {/* Sleek rounded-2xl square with premium gradient border feel */}
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="#0f172a" />
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" stroke="#334155" strokeWidth="1" />
      {/* Factory roof & structure */}
      <path
        d="M10 27V16l6-4 6 4 8-5.3V27H10Z"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Garage bay door */}
      <path
        d="M17 27v-6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 23 21v6"
        stroke="#e2231a"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* CarXen Spark Accent */}
      <path
        d="m28 10 1 2.5L31.5 13.5 29 14.5 28 17l-1-2.5-2.5-1L27 12.5 28 10Z"
        fill="#e2231a"
      />
    </svg>
  );
}
