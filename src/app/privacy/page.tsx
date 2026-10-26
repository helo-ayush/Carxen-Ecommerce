import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import '@/app/legal.css';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  UserCheck,
  Server,
  RefreshCw,
  Trash2,
  Mail,
  ExternalLink,
  Printer,
  ChevronRight,
  Sparkles,
  Info,
  CarFront,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | CARXEN — Precision Automotive Accessories',
  description:
    'Read the CarXen Privacy Policy. Learn how we handle your personal information, protect your data, and adhere to Google API Services User Data Policy and Limited Use requirements.',
  openGraph: {
    title: 'Privacy Policy | CARXEN',
    description:
      'CarXen Privacy Policy — Transparency, zero data selling, and Google OAuth compliance.',
    url: 'https://carxen.com/privacy',
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 26, 2026';
  const effectiveDate = 'January 1, 2026';
  const policyVersion = 'v2.4';

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
            <Link href="/privacy" className="legal-doc-pill active" role="tab" aria-selected="true">
              <ShieldCheck size={14} />
              <span>Privacy Policy</span>
            </Link>
            <Link href="/terms" className="legal-doc-pill" role="tab" aria-selected="false">
              <FileText size={14} />
              <span>Terms of Service</span>
            </Link>
          </div>
        </div>

        {/* Hero Card */}
        <header className="legal-hero">
          <div className="legal-badge-row">
            <span className="legal-badge">
              <ShieldCheck size={12} />
              <span>Official Policy</span>
            </span>
            <span className="legal-badge verified">
              <Sparkles size={12} />
              <span>Google API Limited Use Compliant</span>
            </span>
            <span className="legal-badge neutral">
              <span>Version {policyVersion}</span>
            </span>
          </div>

          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-lead">
            At CarXen, we engineer high-performance automotive accessories with precision, integrity, and absolute respect for your personal privacy. This Privacy Policy details how we collect, store, safeguard, and use your data when you visit our website, register an account, utilize Google Sign-In, or purchase tailored car gear.
          </p>

          <div className="legal-meta-row">
            <div className="legal-meta-item">
              <Info size={14} />
              <span>Last Modified: <strong>{lastUpdated}</strong> · Effective: <strong>{effectiveDate}</strong></span>
            </div>

            <div className="legal-action-tools">
              <a
                href="#google-auth"
                className="legal-action-btn"
                style={{ background: 'rgba(66, 133, 244, 0.08)', color: '#1a73e8', borderColor: 'rgba(66, 133, 244, 0.25)' }}
              >
                <span>Google OAuth Section</span>
                <ChevronRight size={13} />
              </a>
            </div>
          </div>
        </header>

        {/* Main Two-Column Layout */}
        <div className="legal-layout-grid">
          
          {/* Sticky Sidebar Navigation & Trust Summary */}
          <aside className="legal-sidebar" aria-label="Table of Contents">
            <nav className="legal-toc-card">
              <div className="legal-toc-header">
                <FileText size={13} />
                <span>Document Contents</span>
              </div>
              <div className="legal-toc-list">
                <a href="#introduction" className="legal-toc-link">
                  <span className="legal-toc-num">01</span>
                  <span>Introduction & Scope</span>
                </a>
                <a href="#information-we-collect" className="legal-toc-link">
                  <span className="legal-toc-num">02</span>
                  <span>Information We Collect</span>
                </a>
                <a href="#google-auth" className="legal-toc-link" style={{ fontWeight: 600, color: '#1a73e8' }}>
                  <span className="legal-toc-num" style={{ color: '#1a73e8' }}>03</span>
                  <span>Google User Data & OAuth</span>
                </a>
                <a href="#limited-use" className="legal-toc-link">
                  <span className="legal-toc-num">04</span>
                  <span>Google Limited Use Disclosure</span>
                </a>
                <a href="#how-we-use-data" className="legal-toc-link">
                  <span className="legal-toc-num">05</span>
                  <span>How We Use Information</span>
                </a>
                <a href="#sharing" className="legal-toc-link">
                  <span className="legal-toc-num">06</span>
                  <span>Data Sharing & Transfers</span>
                </a>
                <a href="#retention-deletion" className="legal-toc-link">
                  <span className="legal-toc-num">07</span>
                  <span>Data Retention & Deletion</span>
                </a>
                <a href="#security" className="legal-toc-link">
                  <span className="legal-toc-num">08</span>
                  <span>Security & Storage</span>
                </a>
                <a href="#your-rights" className="legal-toc-link">
                  <span className="legal-toc-num">09</span>
                  <span>Your Privacy Rights</span>
                </a>
                <a href="#contact" className="legal-toc-link">
                  <span className="legal-toc-num">10</span>
                  <span>Contact Information</span>
                </a>
              </div>
            </nav>

            {/* Trust Highlights Widget */}
            <div className="legal-trust-widget">
              <div className="legal-trust-title">
                <ShieldCheck size={16} />
                <span>CarXen Trust Guarantee</span>
              </div>
              <p className="legal-trust-desc">
                We are committed to transparent, privacy-first engineering across every customer touchpoint.
              </p>
              <div className="legal-trust-points">
                <div className="legal-trust-point">
                  <Lock size={14} />
                  <span><strong>Zero Data Selling:</strong> We never monetize or sell your personal details to third parties.</span>
                </div>
                <div className="legal-trust-point">
                  <UserCheck size={14} />
                  <span><strong>Instant Revocation:</strong> Revoke Google permissions at any time with one click.</span>
                </div>
                <div className="legal-trust-point">
                  <Server size={14} />
                  <span><strong>Encrypted Storage:</strong> TLS 1.3 in-transit and AES-256 rest encryption.</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Detailed Content Articles */}
          <article className="legal-content">
            
            {/* Section 01: Introduction & Scope */}
            <section id="introduction" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">01</span>
                <h2 className="legal-section-title">Introduction & Scope</h2>
              </div>
              <div className="legal-prose">
                <p>
                  Welcome to <strong>CarXen</strong> (&ldquo;CarXen&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), operated under VedaHub. This Privacy Policy applies to all services, websites, mobile interfaces, and digital platforms operated by CarXen (collectively, the &ldquo;Platform&rdquo;).
                </p>
                <p>
                  By visiting our Platform, creating a customer account, ordering engineered automotive accessories (including seat covers, floor mats, and steering accessories), or authenticating via third-party identity providers such as Google Sign-In, you acknowledge that you have read, understood, and agreed to the practices outlined in this policy.
                </p>
                <p>
                  If you do not agree with this policy, please discontinue use of our Platform. We reserve the right to modify this policy periodically to reflect evolving legal, technical, or operational standards.
                </p>
              </div>
            </section>

            {/* Section 02: Information We Collect */}
            <section id="information-we-collect" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">02</span>
                <h2 className="legal-section-title">Information We Collect</h2>
              </div>
              <div className="legal-prose">
                <p>
                  To design, manufacture, and deliver precision-fitted automotive gear, we collect information directly from you, automatically through your device interactions, and via secure authentication providers:
                </p>

                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Data Elements Collected</th>
                        <th>Primary Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Contact & Profile</strong></td>
                        <td>Full name, email address, phone number, shipping & billing addresses.</td>
                        <td>Order dispatch, digital invoices, account identification, delivery tracking SMS/email.</td>
                      </tr>
                      <tr>
                        <td><strong>Automotive Garage Data</strong></td>
                        <td>Vehicle make, model, manufacturing year, fuel type, and cabin variant.</td>
                        <td>Ensuring 100% precision fitment for custom seat covers, 7D floor mats, and accessories.</td>
                      </tr>
                      <tr>
                        <td><strong>Google OAuth Data</strong></td>
                        <td>Verified Google email, profile display name, avatar photo URL, and unique Google ID.</td>
                        <td>Frictionless, secure single sign-on (SSO) authentication and automated customer profile setup.</td>
                      </tr>
                      <tr>
                        <td><strong>Transactional Data</strong></td>
                        <td>Order history, payment reference IDs, GST billing details, and invoice records.</td>
                        <td>Statutory tax compliance, warranty validation, and order fulfillment.</td>
                      </tr>
                      <tr>
                        <td><strong>Technical & Cookies</strong></td>
                        <td>IP address, browser type, device information, shopping cart state, and session tokens.</td>
                        <td>Platform security, anti-fraud prevention, responsive UI rendering, and session persistence.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>
                  <em>Note on Payment Card Security:</em> All electronic financial payments are processed directly by certified Payment Card Industry Data Security Standard (PCI-DSS) compliant payment gateways (such as Razorpay or Stripe). CarXen never stores your full credit/debit card numbers or CVV on our servers.
                </p>
              </div>
            </section>

            {/* Section 03: Google User Data & OAuth Integration (CRUCIAL FOR GOOGLE VERIFICATION) */}
            <section id="google-auth" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">03</span>
                <h2 className="legal-section-title">Google User Data & OAuth 2.0 Integration</h2>
              </div>
              <div className="legal-prose">
                <p>
                  CarXen provides an optional, highly secure <strong>Google Sign-In</strong> integration enabling drivers to register, log in, and manage their orders without manually maintaining another password.
                </p>

                <div className="legal-callout google">
                  <svg className="legal-callout-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2 3.1v2.6h3.3c2-1.8 3.1-4.4 3.1-7.5z" />
                    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.6 0-4.7-1.7-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
                    <path fill="#FBBC05" d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14z" />
                    <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.5 10c.8-2.4 2.9-4.1 5.5-4.1z" />
                  </svg>
                  <div className="legal-callout-content">
                    <h3 className="legal-callout-title">Explicit Google OAuth Data Disclosures</h3>
                    <div className="legal-callout-text">
                      <p>
                        When you authenticate with Google, CarXen requests permission only to access standard OpenID profile and email scopes (specifically <code>userinfo.email</code>, <code>userinfo.profile</code>, and <code>openid</code>).
                      </p>
                      <p><strong>Specifically, we receive:</strong></p>
                      <ul style={{ margin: '6px 0 10px 16px' }}>
                        <li><strong>Your Primary Email Address:</strong> Used as your unique account username to verify account ownership, dispatch digital order invoices, and send shipping tracking notifications.</li>
                        <li><strong>Your Full Name:</strong> Used to customize your account portal and address your physical order parcels.</li>
                        <li><strong>Your Google Profile Picture (Avatar URL):</strong> Displayed strictly within your authenticated CarXen portal header and profile card.</li>
                        <li><strong>Google Subject Identifier (Unique User ID):</strong> A cryptographic identifier used to establish and maintain your authenticated session.</li>
                      </ul>
                      <p>
                        <strong>What We Never Access:</strong> CarXen does <em>not</em> request, access, or store your Google password, contacts, Gmail inbox, Google Drive files, calendar events, or location history.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 04: Google API Limited Use Policy Disclosure */}
            <section id="limited-use" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">04</span>
                <h2 className="legal-section-title">Google API Services User Data Policy (Limited Use)</h2>
              </div>
              <div className="legal-prose">
                <p>
                  CarXen is fully committed to upholding Google&apos;s rigorous standards for user privacy and data protection. In compliance with the Google API Services User Data Policy:
                </p>

                <div className="google-limited-use-box">
                  <strong>Official Limited Use Disclosure:</strong><br />
                  CarXen&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 700 }}
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </div>

                <ul style={{ marginTop: '16px' }}>
                  <li>
                    <strong>No Data Brokerage or Sale:</strong> We strictly prohibit selling, renting, licensing, or leasing any Google user data to data brokers, ad networks, or external commercial entities under any circumstances.
                  </li>
                  <li>
                    <strong>No Advertising Profiling:</strong> Information obtained through Google APIs is never utilized to build advertising profiles, serve retargeted third-party advertisements, or conduct surveillance analytics.
                  </li>
                  <li>
                    <strong>No AI/ML Training:</strong> Google user data is not used to train generalized artificial intelligence or machine learning models.
                  </li>
                  <li>
                    <strong>Human Access Restrictions:</strong> No human employee or contractor is permitted to read or inspect your personal Google user data unless required to resolve an explicit customer service ticket initiated by you, necessary for security incident investigations, or compelled by applicable law.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 05: How We Use Information */}
            <section id="how-we-use-data" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">05</span>
                <h2 className="legal-section-title">How We Use Information</h2>
              </div>
              <div className="legal-prose">
                <p>
                  We utilize personal and vehicle data strictly for legitimate operational purposes directly associated with our automotive storefront:
                </p>
                <ul>
                  <li><strong>Order Fulfillment & Manufacturing:</strong> Custom-cutting seat upholstery, laser-tailoring floor mats, and dispatching orders to your specified delivery address.</li>
                  <li><strong>Customer Support:</strong> Resolving fitment questions, warranty validations, and addressing technical support inquiries.</li>
                  <li><strong>Account Management:</strong> Maintaining your personal virtual garage, tracking accumulated Apex reward points, and saving order receipts.</li>
                  <li><strong>Operational Communications:</strong> Providing critical transactional notices, such as shipping dispatch alerts, OTPs, password resets, and changes to our terms.</li>
                  <li><strong>Platform Integrity:</strong> Protecting against fraudulent checkout attempts, unauthorized account takeover, and DDoS threats.</li>
                </ul>
              </div>
            </section>

            {/* Section 06: Data Sharing & Third-Party Transfers */}
            <section id="sharing" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">06</span>
                <h2 className="legal-section-title">Data Sharing & Third-Party Service Providers</h2>
              </div>
              <div className="legal-prose">
                <p>
                  CarXen shares data solely with vetted, contractually bound service providers necessary to operate our e-commerce platform. All providers are bound by strict data processing and confidentiality agreements:
                </p>
                <ul>
                  <li><strong>Cloud Infrastructure & Database:</strong> Supabase (PostgreSQL hosting with SSL encryption and row-level security) for reliable, encrypted data storage.</li>
                  <li><strong>Payment Processors:</strong> PCI-DSS certified gateways (Razorpay, Stripe) to securely process payments and issue refunds.</li>
                  <li><strong>Logistics & Couriers:</strong> Verified courier partners (such as Delhivery, Blue Dart, Shiprocket) receiving solely the recipient&apos;s name, phone number, and physical shipping address required to hand-deliver packages.</li>
                  <li><strong>Transactional Email & SMS:</strong> Enterprise delivery networks for dispatching one-time passwords, order confirmations, and tracking links.</li>
                  <li><strong>Legal Compliance:</strong> If mandated by statutory law, court summons, or governmental agency with lawful jurisdiction.</li>
                </ul>
              </div>
            </section>

            {/* Section 07: Data Retention & User Deletion Rights */}
            <section id="retention-deletion" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">07</span>
                <h2 className="legal-section-title">Data Retention & Deletion Instructions</h2>
              </div>
              <div className="legal-prose">
                <p>
                  We retain personal data only for as long as necessary to maintain your customer account, support your product warranty, and comply with statutory accounting and tax retention regulations (typically 7 years for financial transaction records).
                </p>

                <div className="legal-callout action">
                  <Trash2 className="legal-callout-icon" style={{ color: '#16a34a' }} />
                  <div className="legal-callout-content">
                    <h3 className="legal-callout-title">How to Revoke Google Permissions & Request Account Deletion</h3>
                    <div className="legal-callout-text">
                      <p>You maintain complete, autonomous control over your information at all times:</p>
                      
                      <p><strong>1. Revoke Google OAuth Access Immediately:</strong></p>
                      <p>
                        You can instantly disconnect CarXen from your Google account by navigating to the official Google Security permissions dashboard at{' '}
                        <a
                          href="https://myaccount.google.com/permissions"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <span>myaccount.google.com/permissions</span>
                          <ExternalLink size={12} />
                        </a>
                        . Selecting CarXen and clicking &ldquo;Remove Access&rdquo; prevents any future token refreshes.
                      </p>

                      <p><strong>2. Request Complete Account & Data Erasure:</strong></p>
                      <p>
                        To permanently delete your customer profile, order history, garage vehicles, and associated records from our active database, submit an erasure request to{' '}
                        <a href="mailto:privacy@carxen.com?subject=CarXen%20Account%20Deletion%20Request">
                          privacy@carxen.com
                        </a>{' '}
                        or{' '}
                        <a href="mailto:support@carxen.com?subject=CarXen%20Account%20Deletion%20Request">
                          support@carxen.com
                        </a>
                        . Our Data Protection Team processes and confirms all valid erasure requests within <strong>30 calendar days</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 08: Security & Storage */}
            <section id="security" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">08</span>
                <h2 className="legal-section-title">Security & Technical Safeguards</h2>
              </div>
              <div className="legal-prose">
                <p>
                  We implement multi-layered physical, technical, and organizational security measures to protect against unauthorized access, loss, alteration, or disclosure:
                </p>
                <ul>
                  <li><strong>Cryptographic Encryption:</strong> 256-bit Advanced Encryption Standard (AES-256) for data stored at rest; Transport Layer Security (TLS 1.3) with HSTS for all web traffic in transit.</li>
                  <li><strong>Row-Level Security (RLS):</strong> Granular PostgreSQL authorization policies ensuring users can only read and modify their own customer records.</li>
                  <li><strong>Credential Security:</strong> We never store plaintext passwords; authentication utilizes salted Bcrypt hashes and cryptographically signed JWT sessions.</li>
                  <li><strong>Continuous Vulnerability Monitoring:</strong> Regular automated security scanning, dependency vulnerability audits, and rate-limiting protections.</li>
                </ul>
              </div>
            </section>

            {/* Section 09: Your Privacy Rights */}
            <section id="your-rights" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">09</span>
                <h2 className="legal-section-title">Your Rights & Choices</h2>
              </div>
              <div className="legal-prose">
                <p>
                  Regardless of your geographical location, CarXen honors fundamental data subject rights:
                </p>
                <ul>
                  <li><strong>Right to Access:</strong> You can view all saved profile details, garage entries, addresses, and orders directly within your authenticated Customer Portal.</li>
                  <li><strong>Right to Rectification:</strong> You may update or correct your phone number, default shipping addresses, and vehicle selections at any time.</li>
                  <li><strong>Right to Erasure (Right to be Forgotten):</strong> Request deletion of your personal account and records as detailed in Section 07.</li>
                  <li><strong>Right to Restrict or Object:</strong> Opt-out of non-essential promotional newsletters anytime via the one-click &ldquo;Unsubscribe&rdquo; link in emails.</li>
                  <li><strong>Children&apos;s Privacy:</strong> Our platform is intended for licensed motor vehicle drivers and adults aged 18 and older. We do not knowingly solicit or collect data from children under 16.</li>
                </ul>
              </div>
            </section>

            {/* Section 10: Contact & Grievance Officer */}
            <section id="contact" className="legal-section-card">
              <div className="legal-section-header">
                <span className="legal-section-idx">10</span>
                <h2 className="legal-section-title">Contact & Grievance Redressal</h2>
              </div>
              <div className="legal-prose">
                <p>
                  If you have inquiries, concerns, or requests regarding this Privacy Policy, your personal information, or our Google OAuth practices, please reach out directly to our dedicated Data Protection Officer:
                </p>

                <div className="legal-contact-card" style={{ marginTop: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>CarXen Privacy & Compliance Office</h3>
                    <p style={{ fontSize: '13px', color: '#52525b', lineHeight: 1.6 }}>
                      Email: <a href="mailto:privacy@carxen.com" style={{ fontWeight: 600 }}>privacy@carxen.com</a><br />
                      Support: <a href="mailto:support@carxen.com" style={{ fontWeight: 600 }}>support@carxen.com</a><br />
                      Entity: VedaHub / CarXen Automotive Engineered Products<br />
                      Operating Address: E-Commerce Division, Automotive Hub, India
                    </p>
                  </div>
                  <a
                    href="mailto:privacy@carxen.com?subject=Privacy%20Inquiry%20-%20CarXen"
                    className="legal-contact-btn"
                  >
                    <Mail size={15} />
                    <span>Contact Privacy Officer</span>
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
