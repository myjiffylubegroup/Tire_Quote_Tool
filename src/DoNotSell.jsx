// =============================================================================
// DO NOT SELL MY PERSONAL INFORMATION PAGE
// =============================================================================
// Route: #/do-not-sell
// Purpose: CCPA compliance - Do Not Sell My Personal Information
// Required for California businesses under CCPA/CPRA
// =============================================================================

import React from 'react';

const JL_LOGO = '/images/JL_Multicare_Horz_1C.png';

const pageStyles = {
  wrapper: {
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: '#f1f5f9',
    minHeight: '100vh',
    padding: '20px',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#8b1538',
    color: 'white',
    padding: '30px',
    textAlign: 'center',
  },
  logo: {
    height: '50px',
    marginBottom: '15px',
    filter: 'brightness(0) invert(1)',
  },
  title: {
    margin: '0',
    fontSize: '24px',
    fontWeight: '700',
  },
  content: {
    padding: '40px',
  },
  sectionTitle: {
    color: '#8b1538',
    fontSize: '20px',
    marginBottom: '15px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '10px',
  },
  paragraph: {
    color: '#475569',
    lineHeight: '1.7',
    fontSize: '15px',
    marginBottom: '15px',
  },
  list: {
    color: '#475569',
    lineHeight: '2',
    fontSize: '15px',
    paddingLeft: '25px',
  },
  section: {
    marginBottom: '35px',
  },
  footer: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    textAlign: 'center',
    borderTop: '1px solid #e2e8f0',
    color: '#94a3b8',
    fontSize: '12px',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '15px',
    color: '#8b1538',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
  },
};

const DoNotSell = () => {
  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>

        {/* Header */}
        <div style={pageStyles.header}>
          <a href="#/">
            <img src={JL_LOGO} alt="Jiffy Lube MultiCare" style={pageStyles.logo} />
          </a>
          <h1 style={pageStyles.title}>Do Not Sell My Personal Information</h1>
        </div>

        {/* Content */}
        <div style={pageStyles.content}>

          <a href="#/" style={pageStyles.backLink}>← Back to Tire Finder</a>

          <p style={{ ...pageStyles.paragraph, fontStyle: 'italic', color: '#64748b' }}>
            Last Updated: February 2026
          </p>

          {/* Our Commitment */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Our Commitment</h2>
            <p style={pageStyles.paragraph}>
              P.C.J.L., Inc., operating Jiffy Lube MultiCare service centers in California, respects your 
              privacy and your right to control your personal information. Under the California Consumer 
              Privacy Act (CCPA) and the California Privacy Rights Act (CPRA), California residents have 
              the right to opt out of the "sale" or "sharing" of their personal information.
            </p>
            <p style={{
              ...pageStyles.paragraph,
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '15px',
              fontWeight: '500',
              color: '#166534',
            }}>
              <strong>We do not sell your personal information.</strong> We do not and will not sell, rent, 
              or trade your personal information to third parties for monetary or other valuable consideration.
            </p>
          </section>

          {/* What This Means */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>What This Means</h2>
            <p style={pageStyles.paragraph}>
              When you use any of our customer-facing applications (including tires.myjiffylube.ai and 
              greets.myjiffylube.ai) or visit one of our service centers, 
              we collect personal information solely to provide you with our services. This information is 
              used to:
            </p>
            <ul style={pageStyles.list}>
              <li>Generate and deliver your tire quotes</li>
              <li>Process service requests and payments</li>
              <li>Communicate with you about your vehicle service</li>
              <li>Improve our products and services</li>
            </ul>
            <p style={pageStyles.paragraph}>
              We share personal information only with service providers who help us deliver these services 
              (such as email delivery, SMS messaging, and payment processing), and only as necessary for 
              them to perform their functions. These providers are contractually prohibited from using your 
              information for any other purpose.
            </p>
          </section>

          {/* Your Rights */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Your Rights Under California Law</h2>
            <p style={pageStyles.paragraph}>
              As a California resident, you have the right to:
            </p>
            <ul style={pageStyles.list}>
              <li><strong>Know</strong> what personal information we collect, use, and share</li>
              <li><strong>Delete</strong> personal information we have collected from you</li>
              <li><strong>Correct</strong> inaccurate personal information we maintain about you</li>
              <li><strong>Opt out</strong> of the sale or sharing of your personal information (we do not 
                sell or share, but you may still submit a request)</li>
              <li><strong>Non-discrimination</strong> for exercising your privacy rights</li>
            </ul>
            <p style={pageStyles.paragraph}>
              We will not discriminate against you for exercising any of your privacy rights, including by 
              charging different prices, providing a different level of service, or denying you goods or services.
            </p>
          </section>

          {/* How to Submit a Request */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>How to Submit a Request</h2>
            <p style={pageStyles.paragraph}>
              To exercise any of your California privacy rights, you may contact us through any of the 
              following methods:
            </p>
            <ul style={pageStyles.list}>
              <li><strong>Email:</strong> <a href="mailto:support@myjiffylube.com" style={{ color: '#8b1538' }}>support@myjiffylube.com</a></li>
              <li><strong>Phone:</strong> <a href="tel:8053547077" style={{ color: '#8b1538' }}>(805) 354-7077</a></li>
              <li><strong>Mail:</strong> P.C.J.L., Inc., 1440 Jason Way STE 100, Santa Maria, CA 93455</li>
            </ul>
            <p style={pageStyles.paragraph}>
              Please provide sufficient information for us to verify your identity and describe your request 
              in enough detail so we can properly respond. We will aim to verify your identity based on 
              personal information we already hold about you. We will respond to your request within 45 days 
              as required by California law.
            </p>
          </section>

          {/* More Information */}
          <section style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#8b1538', fontSize: '18px', marginBottom: '15px' }}>
              More Information
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', margin: '0' }}>
              For complete details about how we collect, use, and protect your personal information, 
              please review our <a href="#/privacy-policy" style={{ color: '#8b1538' }}>Privacy Policy</a>.
              <br /><br />
              <strong>P.C.J.L., Inc.</strong><br />
              1440 Jason Way STE 100 · Santa Maria, CA 93455<br />
              (805) 354-7077 · support@myjiffylube.com
            </p>
          </section>

        </div>

        {/* Footer */}
        <div style={pageStyles.footer}>
          <p style={{ margin: '0 0 8px 0' }}>
            <a href="#/privacy-policy" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#/terms" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Terms & Conditions</a>
            <a href="#/sms-consent" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>SMS Terms</a>
            <a href="#/do-not-sell" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Do Not Sell My Info</a>
            <a href="#/contact" style={{ color: '#64748b', textDecoration: 'none' }}>Contact Us</a>
          </p>
          <p style={{ margin: '0' }}>
            © 2026 P.C.J.L., Inc. Operating Jiffy Lube MultiCare locations in California
          </p>
        </div>
      </div>
    </div>
  );
};

export default DoNotSell;
