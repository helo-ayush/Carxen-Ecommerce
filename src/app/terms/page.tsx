import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import '@/app/legal.css';
import {
  FileText,
  ShieldCheck,
  Scale,
  CarFront,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  AlertTriangle,
  Award,
  Lock,
  Mail,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | CARXEN — Precision Automotive Accessories',
  description:
    'Read the CarXen Terms of Service. Understand our terms of use, vehicle fitment guarantee, Google authentication integration, order fulfillment, warranty, cancellation relief, and no-returns policy.',
  openGraph: {
    title: 'Terms of Service | CARXEN',
    description:
      'CarXen Terms of Service — Clear, transparent rules for orders, custom fitment, and account security.',
    url: 'https://carxen.com/terms',
  },
};

export default function TermsOfServicePage() {
  const lastUpdated = 'October 26, 2026';
  const effectiveDate = 'January 1, 2026';
  const termsVersion = 'v2.4';

  return (
    <div className="in-shop legal-page-shell">
      <main className="legal-container">
        
        {/* Top Breadcrumb & Document Switcher */}
        <div className="legal-top-bar">
          <Link href="/shop" className="legal-back-btn" aria-label="Return to Storefront">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to Storefront</span>
          </Link>

          <div className="legal-doc-switch" role="tablist" aria-label="Legal Documents">
            <Link href="/privacy" className="legal-doc-pill" role="tab" aria-selected="false">
              <ShieldCheck size={14} />
              <span>Privacy Policy</span>
            </Link>
            <Link href="/terms" className="legal-doc-pill active" role="tab" aria-selected="true">
              <FileText size={14} />
              <span>Terms of Service</span>
            </Link>
          </div>
        </div>

        {/* Hero Card */}
        <header className="legal-hero">
          <div className="legal-badge-row">
            <span className="legal-badge">
              <Scale size={12} />
              <span>Customer Agreement</span>
            </span>
            <span className="legal-badge verified">
              <Sparkles size={12} />
              <span>Google Verified OAuth Terms</span>
            </span>
            <span className="legal-badge neutral">
              <span>Version {termsVersion}</span>
            </span>
          </div>

          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-lead">
            These Terms of Service govern your access to and use of CarXen&apos;s digital platform, Google Sign-In authentication, custom vehicular fitment ordering, and automotive accessories. By accessing our platform or purchasing our gear, you agree to these terms.
          </p>

          <div className="legal-meta-row">
            <div className="legal-meta-item">
              <Info size={14} />
              <span>Last Modified: <strong>{lastUpdated}</strong> · Effective: <strong>{effectiveDate}</strong></span>
            </div>

            <div className="legal-action-tools">
              <a
                href="#fitment-orders"
                className="legal-action-btn"
                style={{ background: 'rgba(226, 35, 26, 0.08)', color: 'var(--red, #e2231a)', borderColor: 'rgba(226, 35, 26, 0.25)' }}
              >
                <span>Fitment & Orders</span>
                <ChevronRight size={13} />
              </a>
            </div>
          </div>
        </header>

        {/* Main Two-Column Layout */}
        <div className="legal-layout-grid">
          
          {/* Sticky Sidebar Navigation */}
          <aside className="legal-sidebar" aria-label="Table of Contents">
            <nav className="legal-toc-card">
              <div className="legal-toc-header">
                <FileText size={13} />
                <span>Document Contents</span>
              </div>
              <div className="legal-toc-list">
                <a href="#agreement" className="legal-toc-link">
                  <span className="legal-toc-num">01</span>
                  <span>Agreement & Eligibility</span>
                </a>
                <a href="#account-auth" className="legal-toc-link" style={{ fontWeight: 600, color: '#1a73e8' }}>
                  <span className="legal-toc-num" style={{ color: '#1a73e8' }}>02</span>
                  <span>Account & Google Sign-In</span>
                </a>
                <a href="#fitment-orders" className="legal-toc-link">
                  <span className="legal-toc-num">03</span>
                  <span>Fitment & Custom Orders</span>
                </a>
                <a href="#pricing-payments" className="legal-toc-link">
                  <span className="legal-toc-num">04</span>
                  <span>Pricing, Tax & Payments</span>
                </a>
                <a href="#shipping-delivery" className="legal-toc-link">
                  <span className="legal-toc-num">05</span>
                  <span>Shipping & Delivery</span>
                </a>
                <a href="#returns-refunds" className="legal-toc-link">
                  <span className="legal-toc-num">06</span>
                  <span>No-Returns & Cancellation</span>
                </a>
                <a href="#warranty" className="legal-toc-link">
                  <span className="legal-toc-num">07</span>
                  <span>Manufacturer Warranty</span>
                </a>
                <a href="#safety-disclaimer" className="legal-toc-link">
                  <span className="legal-toc-num">08</span>
                  <span>Automotive Safety Disclaimer</span>
                </a>
                <a href="#intellectual-property" className="legal-toc-link">
                  <span className="legal-toc-num">09</span>
                  <span>Intellectual Property</span>
                </a>
                <a href="#liability-governing" className="legal-toc-link">
                  <span className="legal-toc-num">10</span>
                  <span>Liability & Governing Law</span>
                </a>
              </div>
            </nav>

            {/* Quick Guarantees Card */}
            <div className="legal-trust-widget">
              <div className="legal-trust-title">
                <Award size={16} />
                <span>CarXen Standard</span>
              </div>
              <p className="legal-trust-desc">
                Engineered car accessories crafted with uncompromising quality and driver-first policies.
              </p>
              <div className="legal-trust-points">
                <div className="legal-trust-point">
                  <CarFront size={14} />
                  <span><strong>100% Fitment Guarantee:</strong> Verified 3D digital patterns for 100+ car models.</span>
                </div>
                <div className="legal-trust-point">
                  <RotateCcw size={14} />
                  <span><strong>6-Hour Relief Period:</strong> Instant self-service order cancellation window before production.</span>
                </div>
                <div className="legal-trust-point">
                  <ShieldCheck size={14} />
                  <span><strong>Multi-Year Warranty:</strong> Dedicated material and seam integrity coverage.</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Detailed Content Articles */}
          <article className="legal-content">
            
            {/* Section 01: Agreement & Eligibility */}
            <section id="agreement" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">01</span>
                <h2 className="legal-section-title">Agreement & Eligibility</h2>
              </div>
              <div className="legal-prose">
                <p>
                  These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;Customer&rdquo;, or &ldquo;you&rdquo;) and <strong>CarXen</strong> (&ldquo;CarXen&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), under VedaHub.
                </p>
                <p>
                  By creating an account, authenticating via Google Sign-In, browsing our storefront, adding items to your cart, or purchasing products, you affirm that:
                </p>
                <ul>
                  <li>You are at least 18 years of age or possess the legal capacity to enter into a binding agreement in your jurisdiction.</li>
                  <li>You have read, understood, and agree to be bound by these Terms and our <Link href="/privacy">Privacy Policy</Link>.</li>
                  <li>All registration and vehicle information you submit is accurate, truthful, and current.</li>
                </ul>
              </div>
            </section>

            {/* Section 02: Account & Google Sign-In */}
            <section id="account-auth" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">02</span>
                <h2 className="legal-section-title">Account Registration & Google Authentication</h2>
              </div>
              <div className="legal-prose">
                <p>
                  To place orders, track live parcel statuses, save vehicles to your Virtual Garage, and accrue Apex loyalty points, you may create an account using your email address or through <strong>Google Sign-In</strong>.
                </p>

                <div className="legal-callout google">
                  <svg className="legal-callout-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2 3.1v2.6h3.3c2-1.8 3.1-4.4 3.1-7.5z" />
                    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.6 0-4.7-1.7-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
                    <path fill="#FBBC05" d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14z" />
                    <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.5 10c.8-2.4 2.9-4.1 5.5-4.1z" />
                  </svg>
                  <div className="legal-callout-content">
                    <h3 className="legal-callout-title">Google Authentication Terms & Responsibilities</h3>
                    <div className="legal-callout-text">
                      <p>
                        When signing in via Google, you authorize CarXen to verify your identity via Google OAuth 2.0 and securely retrieve your basic verified profile information (name, email address, profile picture, and Google user ID).
                      </p>
                      <ul style={{ margin: '6px 0 10px 16px' }}>
                        <li><strong>Credential Confidentiality:</strong> You remain solely responsible for maintaining the confidentiality of your Google account credentials and all activities occurring under your authenticated session.</li>
                        <li><strong>Unauthorized Access:</strong> You agree to notify CarXen immediately at <a href="mailto:support@carxen.com">support@carxen.com</a> upon becoming aware of any breach of security or unauthorized account access.</li>
                        <li><strong>Revocation:</strong> You may disconnect CarXen from your Google account at any time via your Google Account Security Dashboard without forfeiting physical warranty rights on existing delivered orders.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 03: Fitment & Custom Orders */}
            <section id="fitment-orders" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">03</span>
                <h2 className="legal-section-title">Vehicle Fitment & Custom Tailored Orders</h2>
              </div>
              <div className="legal-prose">
                <p>
                  CarXen specializes in engineered automotive accessories. Many products—such as bespoke leatherette seat covers, 7D laser-cut floor mats, and steering wraps—are tailored to specific vehicle makes, models, model years, and seat configurations (e.g., 60:40 split rear seats, 7-seater configurations, or captain seats).
                </p>
                <ul>
                  <li><strong>Customer Fitment Responsibility:</strong> It is the customer&apos;s responsibility to select the exact vehicle make, model, variant, and year prior to confirming order checkout.</li>
                  <li><strong>Fitment Guarantee:</strong> If an accessory does not fit the vehicle specified during your purchase due to a manufacturing dimensional error on our part, CarXen will alter, remake, or replace the product at zero additional cost.</li>
                  <li><strong>Digital Previews:</strong> Product photography, 3D renders, and color swatches on our website represent materials as accurately as possible. Slight color variations may occur across different computer displays and natural leatherette batches.</li>
                </ul>
              </div>
            </section>

            {/* Section 04: Pricing, Tax & Payments */}
            <section id="pricing-payments" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">04</span>
                <h2 className="legal-section-title">Pricing, Taxes & Payment Gateway Security</h2>
              </div>
              <div className="legal-prose">
                <p>
                  All product prices listed on CarXen are in Indian Rupees (INR ₹) and are inclusive of applicable Goods and Services Tax (GST) unless explicitly indicated otherwise during corporate B2B wholesale checkout.
                </p>
                <ul>
                  <li><strong>Payment Methods:</strong> We accept major credit/debit cards, UPI (Google Pay, PhonePe, Paytm), net banking, and verified digital wallets through encrypted payment gateways.</li>
                  <li><strong>B2B & GST Invoicing:</strong> Registered business partners and wholesale accounts can submit valid GSTIN numbers during checkout to generate compliant B2B tax invoices with eligible input tax credit.</li>
                  <li><strong>Pricing Errors:</strong> In the rare event a product is mistakenly listed at an incorrect price due to a typographical or system error, CarXen reserves the right to cancel the affected order and issue an immediate 100% refund.</li>
                </ul>
              </div>
            </section>

            {/* Section 05: Shipping & Delivery */}
            <section id="shipping-delivery" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">05</span>
                <h2 className="legal-section-title">Shipping, Transit & Delivery</h2>
              </div>
              <div className="legal-prose">
                <p>
                  We partner with top-tier courier carriers to ensure rapid, tracked delivery nationwide.
                </p>
                <ul>
                  <li><strong>Dispatch Timelines:</strong> In-stock universal accessories typically dispatch within 24–48 business hours. Custom laser-cut mats and bespoke seat covers undergo precision manufacturing and typically dispatch within 3–5 business days.</li>
                  <li><strong>Tracking & Notifications:</strong> Once your package is scanned into the logistics network, you will receive an SMS and email notification with an active tracking link.</li>
                  <li><strong>Inspection upon Receipt:</strong> Customers must visually inspect parcels for outer tampering or significant transit damage before signing for acceptance from the courier agent.</li>
                </ul>
              </div>
            </section>

            {/* Section 06: No-Returns & Order Cancellation Policy */}
            <section id="returns-refunds" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">06</span>
                <h2 className="legal-section-title">No-Returns & Order Cancellation Policy</h2>
              </div>
              <div className="legal-prose">
                <p>
                  Because CarXen precision-engineers, bespoke-crafts, and laser-cuts automotive interior accessories to individual order specifications, <strong>CarXen operates a strict No-Returns Policy</strong>. Once an order has been manufactured, dispatched, or delivered, returns or exchanges for change of mind or personal preference are not accepted.
                </p>

                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Policy Stage</th>
                        <th>Applicable Timeline</th>
                        <th>Terms & Eligibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>6-Hour Relief Cancellation</strong></td>
                        <td>Within 6 Hours of order placement</td>
                        <td>Self-service 1-click cancellation available via Account Profile or Wholesale Orders dashboard. 100% full refund automatically issued.</td>
                      </tr>
                      <tr>
                        <td><strong>Post-6-Hour Window</strong></td>
                        <td>After 6 Hours until dispatch</td>
                        <td>Orders enter live production & cutting queue. Cancellations require customer support authorization (care@carxen.io) and cannot be guaranteed.</td>
                      </tr>
                      <tr>
                        <td><strong>Dispatched & Delivered Goods</strong></td>
                        <td>Post-delivery</td>
                        <td><strong>No returns or refunds accepted.</strong> All delivered consignments and retail orders are final sale.</td>
                      </tr>
                      <tr>
                        <td><strong>Transit Damage / Manufacturing Defect</strong></td>
                        <td>Within 48 Hours of delivery</td>
                        <td>If goods arrive physically damaged or with a verified manufacturing defect, contact care@carxen.io with unboxing evidence for an expedited replacement under our Warranty.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>
                  <strong>Replacement Resolution:</strong> Verified transit damage or manufacturing defects reported within 48 hours are eligible for replacement parts manufactured and shipped at no extra charge. We do not provide cash or card refunds for delivered goods.
                </p>
              </div>
            </section>

            {/* Section 07: Manufacturer Warranty */}
            <section id="warranty" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">07</span>
                <h2 className="legal-section-title">Manufacturer Limited Warranty</h2>
              </div>
              <div className="legal-prose">
                <p>
                  CarXen provides a <strong>Limited Manufacturer Warranty</strong> (ranging from 1 Year to 3 Years depending on the product tier) covering:
                </p>
                <ul>
                  <li>Premature material flaking, bubbling, or peeling under normal automotive interior conditions.</li>
                  <li>Structural stitch failures and seam separation along factory-stitched panels.</li>
                  <li>Hardware defects on fasteners, clips, and heavy-duty zippers.</li>
                </ul>
                <p>
                  <em>Warranty Exclusions:</em> The warranty does not cover normal wear and tear over time, cuts from sharp objects or pet claws, chemical bleach or aggressive solvent damage, burns, or damage caused by improper or forced installation.
                </p>
              </div>
            </section>

            {/* Section 08: Automotive Safety Disclaimer */}
            <section id="safety-disclaimer" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">08</span>
                <h2 className="legal-section-title">Automotive Safety Disclaimer & Installation</h2>
              </div>
              <div className="legal-prose">
                <div className="legal-callout security">
                  <AlertTriangle className="legal-callout-icon" style={{ color: 'var(--red, #e2231a)' }} />
                  <div className="legal-callout-content">
                    <h3 className="legal-callout-title">Critical Vehicle Safety Advisory</h3>
                    <div className="legal-callout-text">
                      <p>
                        Your vehicle is equipped with sensitive occupant safety systems, including side-impact torso airbags embedded inside seat bolsters and floor pedal clearances.
                      </p>
                      <p>
                        <strong>1. Side Airbag Deployment:</strong> Never install non-airbag-compatible seat covers over front seats equipped with active side airbags. CarXen airbag-compatible covers feature engineered breakaway seams; you must verify that the airbag deployment tag aligns strictly with the corresponding side airbag icon on your seat.
                      </p>
                      <p>
                        <strong>2. Floor Mat Pedal Clearance:</strong> All floor mats must be anchored using the supplied vehicle retention retention clips or velcro tabs to prevent mat slippage underneath the accelerator or brake pedals.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 09: Intellectual Property */}
            <section id="intellectual-property" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">09</span>
                <h2 className="legal-section-title">Intellectual Property Rights</h2>
              </div>
              <div className="legal-prose">
                <p>
                  The CarXen name, logo, proprietary tailoring patterns, digital CAD blueprints, graphics, UI design, and website software are the exclusive intellectual property of CarXen and VedaHub.
                </p>
                <ul>
                  <li>You are granted a personal, non-exclusive, non-transferable license to access the platform for individual, non-commercial shopping purposes.</li>
                  <li>You may not scrape, reproduce, reverse-engineer, duplicate, copy, or resell any part of our platform or pattern database without prior written authorization.</li>
                  <li>Vehicle brand names (e.g., Hyundai, Toyota, Mahindra, Tata, BMW) mentioned on this website are used solely to indicate vehicle fitment compatibility and remain the trademarks of their respective owners.</li>
                </ul>
              </div>
            </section>

            {/* Section 10: Liability, Governing Law & Disputes */}
            <section id="liability-governing" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">10</span>
                <h2 className="legal-section-title">Limitation of Liability, Governing Law & Jurisdiction</h2>
              </div>
              <div className="legal-prose">
                <p>
                  To the maximum extent permitted by applicable law, CarXen and its directors, employees, or partners shall not be liable for any indirect, incidental, punitive, or consequential damages arising from the use of, or inability to use, our platform or accessories.
                </p>
                <ul>
                  <li><strong>Maximum Liability:</strong> In no event shall our total aggregate liability exceed the total purchase amount paid by you for the specific product giving rise to the claim.</li>
                  <li><strong>Governing Law:</strong> These Terms and any dispute arising from them shall be governed by and construed in accordance with the laws of India.</li>
                  <li><strong>Dispute Resolution:</strong> Any legal dispute, controversy, or claim shall be subject to the exclusive jurisdiction of the competent courts located in the territory of our primary corporate registration.</li>
                </ul>

                <div className="legal-contact-card" style={{ marginTop: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Have questions regarding our Terms?</h3>
                    <p style={{ fontSize: '13px', color: '#52525b', lineHeight: 1.6 }}>
                      Email: <a href="mailto:legal@carxen.com" style={{ fontWeight: 600 }}>legal@carxen.com</a><br />
                      Support: <a href="mailto:support@carxen.com" style={{ fontWeight: 600 }}>support@carxen.com</a><br />
                      Response time: Within 24–48 business hours
                    </p>
                  </div>
                  <a
                    href="mailto:legal@carxen.com?subject=CarXen%20Terms%20Inquiry"
                    className="legal-contact-btn"
                  >
                    <Mail size={15} />
                    <span>Contact Legal Team</span>
                  </a>
                </div>
              </div>
            </section>

          </article>
        </div>

      </main>
      <Footer />
    </div>
  );
}
