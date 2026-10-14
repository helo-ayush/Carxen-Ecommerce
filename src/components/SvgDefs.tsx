import React from 'react';

export function SvgDefs() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#47474f" />
            <stop offset=".5" stopColor="#25252a" />
            <stop offset="1" stopColor="#0d0d10" />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34343b" />
            <stop offset="1" stopColor="#111114" />
          </linearGradient>
          <pattern id="quilt" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0H22M0 0V22" stroke="#55555e" strokeWidth="1.1" />
            <path d="M0 1.6H22M1.6 0V22" stroke="#000" strokeWidth=".8" opacity=".55" />
          </pattern>
          <pattern id="quiltB" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0H40M0 0V40" stroke="#5a5a64" strokeWidth="1.6" />
            <path d="M0 2.6H40M2.6 0V40" stroke="#000" strokeWidth="1" opacity=".6" />
            <circle r="1.7" fill="#e2231a" />
          </pattern>
          <pattern id="perf" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.6" fill="#000" opacity=".6" />
            <circle cx="10" cy="10" r="1.6" fill="#000" opacity=".6" />
          </pattern>
          <pattern id="ridge" width="15" height="15" patternUnits="userSpaceOnUse">
            <path d="M0 10 L7.5 4 L15 10" stroke="#4a4a53" strokeWidth="1.5" fill="none" />
          </pattern>
          <pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 4H8M4 0V8" stroke="#8d8d95" strokeWidth=".9" />
          </pattern>
          <pattern id="grip" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="2" fill="#3b3b43" />
          </pattern>
        </defs>
      </svg>

      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="a-seat" viewBox="0 0 320 400">
            <ellipse cx="160" cy="383" rx="112" ry="12" fill="#000" opacity=".25" />
            <path d="M118 20h84c14 0 25 11 25 25v33c0 14-11 25-25 25h-84c-14 0-25-11-25-25V45c0-14 11-25 25-25z" fill="url(#g1)" />
            <path d="M148 26v52M172 26v52" stroke="#e2231a" strokeWidth="1.3" strokeDasharray="3 4" />
            <path d="M160 96c-46 0-70 22-74 62-4 44-6 88-2 132 2 26 22 40 76 40s74-14 76-40c4-44 2-88-2-132-4-40-28-62-74-62z" fill="url(#g1)" />
            <path d="M104 150c-12 36-14 96-8 136M216 150c12 36 14 96 8 136" stroke="#e2231a" strokeWidth="1.3" strokeDasharray="3 4.5" fill="none" />
            <path d="M160 112c-30 0-44 14-47 40-3 40-4 82-1 122 2 20 16 30 48 30s46-10 48-30c3-40 2-82-1-122-3-26-17-40-47-40z" fill="url(#g2)" />
            <path d="M160 112c-30 0-44 14-47 40-3 40-4 82-1 122 2 20 16 30 48 30s46-10 48-30c3-40 2-82-1-122-3-26-17-40-47-40z" fill="url(#quilt)" opacity=".6" />
            <ellipse cx="127" cy="185" rx="9" ry="56" fill="#fff" opacity=".06" />
            <path d="M92 306c-14 4-22 14-22 26 0 16 10 26 26 30 20 5 108 5 128 0 16-4 26-14 26-30 0-12-8-22-22-26-24-7-112-7-136 0z" fill="url(#g1)" />
            <path d="M112 312c-8 3-12 9-12 16 0 9 6 15 16 17 16 4 72 4 88 0 10-2 16-8 16-17 0-7-4-13-12-16-20-6-76-6-96 0z" fill="url(#g2)" />
            <path d="M112 312c-8 3-12 9-12 16 0 9 6 15 16 17 16 4 72 4 88 0 10-2 16-8 16-17 0-7-4-13-12-16-20-6-76-6-96 0z" fill="url(#quilt)" opacity=".5" />
          </symbol>
          <symbol id="a-mats" viewBox="0 0 400 300">
            <ellipse cx="205" cy="276" rx="150" ry="12" fill="#000" opacity=".22" />
            <g transform="rotate(9 250 140)">
              <rect x="160" y="34" width="185" height="200" rx="18" fill="url(#g2)" />
              <rect x="176" y="50" width="153" height="168" rx="10" fill="url(#ridge)" opacity=".6" />
            </g>
            <g transform="rotate(-7 165 160)">
              <rect x="58" y="56" width="212" height="204" rx="20" fill="url(#g1)" />
              <rect x="74" y="72" width="180" height="172" rx="12" fill="none" stroke="#55555e" strokeWidth="1.4" />
              <rect x="82" y="80" width="164" height="104" rx="8" fill="url(#ridge)" opacity=".8" />
              <rect x="92" y="152" width="82" height="76" rx="9" fill="#101014" stroke="#3b3b43" />
              <rect x="188" y="196" width="66" height="19" rx="4" fill="#0c0c0e" stroke="#55555e" />
              <image href="/logo.png" x="190" y="197" width="62" height="17" preserveAspectRatio="xMidYMid meet" />
            </g>
          </symbol>
          <symbol id="a-wheel" viewBox="0 0 320 320">
            <ellipse cx="160" cy="304" rx="100" ry="10" fill="#000" opacity=".22" />
            <circle cx="160" cy="150" r="110" fill="none" stroke="url(#g1)" strokeWidth="30" />
            <circle cx="160" cy="150" r="110" fill="none" stroke="#000" strokeOpacity=".3" strokeWidth="26" strokeDasharray="1.6 6" />
            <circle cx="160" cy="150" r="110" fill="none" stroke="#e2231a" strokeWidth="28" strokeDasharray="36 655" strokeDashoffset="18" transform="rotate(-90 160 150)" />
            <path d="M62 108A110 110 0 0 1 148 41" stroke="#fff" strokeOpacity=".14" strokeWidth="7" fill="none" strokeLinecap="round" />
            <rect x="50" y="138" width="72" height="25" rx="11" fill="url(#g2)" />
            <rect x="198" y="138" width="72" height="25" rx="11" fill="url(#g2)" />
            <rect x="146" y="196" width="28" height="68" rx="12" fill="url(#g2)" />
            <circle cx="160" cy="150" r="45" fill="url(#g1)" />
            <image href="/logo.png" x="130" y="139" width="60" height="22" preserveAspectRatio="xMidYMid meet" />
          </symbol>
          <symbol id="a-pillow" viewBox="0 0 320 200">
            <ellipse cx="160" cy="178" rx="118" ry="10" fill="#000" opacity=".22" />
            <path d="M62 46c-22 0-36 20-36 50s14 50 36 50c32 0 40-18 98-18s66 18 98 18c22 0 36-20 36-50s-14-50-36-50c-32 0-40 18-98 18s-66-18-98-18z" fill="url(#g1)" />
            <path d="M132 78c8 14 8 30 0 44M160 76c8 16 8 32 0 48M188 78c8 14 8 30 0 44" stroke="#55555e" strokeWidth="1.2" fill="none" />
            <path d="M160 76v48" stroke="#e2231a" strokeWidth="1.3" strokeDasharray="3 4" />
            <ellipse cx="104" cy="76" rx="34" ry="12" fill="#fff" opacity=".07" />
          </symbol>
          <symbol id="a-arm" viewBox="0 0 320 200">
            <ellipse cx="160" cy="172" rx="112" ry="10" fill="#000" opacity=".22" />
            <rect x="66" y="72" width="188" height="82" rx="26" fill="url(#g1)" />
            <path d="M66 100c0-16 13-28 28-28h132c15 0 28 12 28 28v4H66z" fill="url(#g2)" />
            <path d="M70 110h180" stroke="#e2231a" strokeWidth="1.3" strokeDasharray="3 4.5" />
            <path d="M96 84h96" stroke="#fff" strokeOpacity=".1" strokeWidth="7" strokeLinecap="round" />
          </symbol>
          <symbol id="a-trunk" viewBox="0 0 320 220">
            <ellipse cx="160" cy="198" rx="120" ry="10" fill="#000" opacity=".22" />
            <path d="M62 112L96 66h128l34 46z" fill="#101014" stroke="#3b3b43" />
            <path d="M160 66v46" stroke="#3b3b43" />
            <rect x="58" y="110" width="204" height="72" rx="12" fill="url(#g1)" />
            <path d="M58 136h204" stroke="#e2231a" strokeWidth="1.2" strokeDasharray="3 4.5" />
            <rect x="128" y="96" width="64" height="12" rx="6" fill="#1a1a1e" stroke="#55555e" />
          </symbol>
        </defs>
      </svg>
    </>
  );
}
