# CARXEN — Precision Car Accessories E-Commerce

> Engineered for every drive. High-performance automobile interior accessories and custom-fit parts crafted with precision tolerances.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

---

## 🚗 Overview

**CARXEN** is a modern, high-end e-commerce platform engineered specifically for automotive enthusiasts and car owners. It features custom vehicle fitment matching, 3D interactive graphics, multi-angle product views, live stitch-color previews, real-time cart and checkout calculations, and vehicle garage management.

---

## ✨ Features

- **Precision Landing Experience**:
  - High-impact typography with Anton, DM Sans, and IBM Plex Mono.
  - Interactive 3D tilt hero card, smooth stats count-up, and spinning orb exploration button.
  - 4-layer exploded view SVG anatomy detailing craftsmanship (Leatherette, 8mm foam, 3D knit, anti-slip backing).
  - Live technical wireframe blueprint vehicle with laser scanning animation.
  - Driver testimonial slider and infinite marquee ticker.

- **Vehicle Garage (`/garage`)**:
  - Step-by-step vehicle setup (Brand, Model, Year, Fuel).
  - Compatible accessories counter and vehicle profile persistence.

- **Dedicated Vehicle Shop (`/shop`)**:
  - Car-specific accessory filtering (`✓ Fits your Creta`).
  - Dual price slider with dynamic histogram distribution.
  - Series filter (Signature, Sport, Urban, Essentials) and star rating filters.

- **Interactive Product Details (`/product/[id]`)**:
  - Multi-camera angle switcher (4 distinct viewpoints).
  - Real-time stitch colour tint selector (Red, Blue, Amber).
  - 6-digit Pincode delivery estimator with arrival calculation.
  - "Bought together" 3-item bundle calculator with instant bundle addition.
  - Verified reviews breakdown with rating distribution.

- **Full Checkout Flow (`/checkout` & `/order/[id]`)**:
  - 3-step checkout status (Cart ➔ Details ➔ Done).
  - Saved delivery address management with inline new address form.
  - Standard vs. Express delivery speed options.
  - Payment methods: UPI (Google Pay / PhonePe / Paytm), Net Banking, Cash on delivery.
  - **Live Interactive Credit Card Preview** updating card number, cardholder name, and expiry date in real-time.
  - Automatic discount application with coupon `CARXEN10`.
  - Order confirmation screen with animation and order tracking history.

- **User Accounts & Wishlist (`/account` & `/wishlist`)**:
  - Active vehicle garage summary with instant vehicle switcher.
  - Historical order records.
  - Favourites management.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Curated Vanilla CSS with custom tokens and micro-interactions
- **State Management**: React Context with LocalStorage persistence

### UI component setup

This project already has TypeScript and uses `src/components` plus
`src/app/globals.css`. It does not currently use Tailwind CSS v4 or shadcn/ui;
the Apple-style category carousel is integrated with the existing CSS system so
the rest of the site does not need to be migrated.

If future components should use the shadcn/ui defaults, install the missing
pieces from the project root:

```bash
npm install tailwindcss @tailwindcss/postcss postcss
npx shadcn@latest init
```

Keep generated primitives in `src/components/ui` (the equivalent of the
default `/components/ui` path for this `src`-based project), shared helpers in
`src/lib`, and hooks in `src/hooks`. The folder matters because shadcn
components and their import aliases conventionally resolve from this location.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.17+ or v20+)
- npm or pnpm

### Installation

```bash
git clone https://github.com/helo-ayush/Carxen-Ecommerce.git
cd Carxen-Ecommerce
npm install
```

### Running Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to explore the application.

### Production Build

```bash
npm run build
npm start
```
