// =============================================================================
// SMS CONSENT PAGE - For Twilio Verification
// =============================================================================
// Route: #/sms-consent
// Purpose: Documents SMS opt-in process for Twilio compliance
// Updated: February 2026 - corrected contact info, linked to Privacy Policy & Terms
// =============================================================================

import React from 'react';

const JL_LOGO = 'https://vzsitlasfekjkvsaukmh.supabase.co/storage/v1/object/public/assets/JL_Multicare_Horz_1C.png';

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
  link: {
    color: '#8b1538',
  },
};

const SmsConsent = () => {
  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>

        {/* Header */}
        <div style={pageStyles.header}>
          <a href="#/">
            <img src={JL_LOGO} alt="Jiffy Lube MultiCare" style={pageStyles.logo} />
          </a>
          <h1 style={pageStyles.title}>SMS Messaging Consent & Terms</h1>
        </div>

        {/* Content */}
        <div style={pageStyles.content}>

          <a href="#/" style={pageStyles.backLink}>← Back to Tire Finder</a>

          {/* Overview */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Overview</h2>
            <p style={pageStyles.paragraph}>
              P.C.J.L., Inc., operating Jiffy Lube MultiCare service centers in California ("we", "us", "our"), 
              offers an optional SMS messaging service to provide customers with tire quotes, service reminders, 
              and appointment confirmations. This page describes how we collect consent and manage SMS communications.
            </p>
          </section>

          {/* How Consent is Collected */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>How We Collect Consent</h2>
            <p style={pageStyles.paragraph}>
              Customers provide explicit consent to receive SMS messages through the following methods:
            </p>
            <ul style={pageStyles.list}>
              <li><strong>Online Quote Request:</strong> When using our online tire quote system at 
                tires.myjiffylube.ai, customers provide their phone number and request their quote be 
                sent via text message.</li>
              <li><strong>In-Store Authorization:</strong> When requesting a tire quote by phone or in-store, 
                customers verbally provide their mobile phone number and authorize us to send their quote 
                via text message.</li>
            </ul>
            <p style={pageStyles.paragraph}>
              Consent is not required as a condition of purchasing any goods or services.
            </p>
          </section>

          {/* Types of Messages */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Types of Messages</h2>
            <p style={pageStyles.paragraph}>
              Customers who opt in may receive the following types of SMS messages:
            </p>
            <ul style={pageStyles.list}>
              <li><strong>Tire Quotes:</strong> A link to view their personalized tire quote with pricing and 
                vehicle information</li>
              <li><strong>Service Updates:</strong> Notifications when their vehicle service is complete</li>
              <li><strong>Appointment Reminders:</strong> Reminders about upcoming scheduled appointments</li>
            </ul>
            <p style={pageStyles.paragraph}>
              <strong>Message Frequency:</strong> Typically 1–3 messages per service visit. We do not send 
              marketing or promotional messages.
            </p>
          </section>

          {/* Opting Out */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Opting Out</h2>
            <p style={pageStyles.paragraph}>
              You can opt out of receiving SMS messages at any time by:
            </p>
            <ul style={pageStyles.list}>
              <li>Replying <strong>STOP</strong> to any message from us</li>
              <li>Contacting us at support@myjiffylube.com</li>
              <li>Calling our office at (805) 354-7077</li>
            </ul>
            <p style={pageStyles.paragraph}>
              After opting out, you will receive one final confirmation message and will no longer receive 
              SMS messages from us unless you opt in again.
            </p>
          </section>

          {/* Help */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Help & Support</h2>
            <p style={pageStyles.paragraph}>
              For help or questions about our SMS service, customers can:
            </p>
            <ul style={pageStyles.list}>
              <li>Reply <strong>HELP</strong> to any message</li>
              <li>Visit any of our Jiffy Lube MultiCare locations</li>
              <li>Email us at <a href="mailto:support@myjiffylube.com" style={pageStyles.link}>support@myjiffylube.com</a></li>
              <li>Call our office at <a href="tel:8053547077" style={pageStyles.link}>(805) 354-7077</a></li>
            </ul>
          </section>

          {/* Costs */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Message & Data Rates</h2>
            <p style={pageStyles.paragraph}>
              Message and data rates may apply depending on your mobile carrier and plan. We do not charge 
              for SMS messages, but your carrier's standard messaging rates may apply. Our SMS service works 
              with all major U.S. carriers.
            </p>
          </section>

          {/* Privacy */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>Privacy</h2>
            <p style={pageStyles.paragraph}>
              We respect your privacy. Phone numbers collected for SMS communications are used solely for 
              the purposes described above. We do not sell, rent, or share your phone number with third 
              parties for marketing purposes. For more information, please review 
              our <a href="#/privacy-policy" style={pageStyles.link}>Privacy Policy</a> and{' '}
              <a href="#/terms" style={pageStyles.link}>Terms & Conditions</a> (including Mobile Text Terms 
              of Use).
            </p>
          </section>

          {/* Contact */}
          <section style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#8b1538', fontSize: '18px', marginBottom: '15px' }}>
              Contact Us
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.8', fontSize: '15px', margin: '0' }}>
              <strong>P.C.J.L., Inc.</strong><br />
              Operating Jiffy Lube MultiCare locations in California<br />
              1440 Jason Way STE 100<br />
              Santa Maria, CA 93455<br />
              Phone: (805) 354-7077<br />
              Email: support@myjiffylube.com<br />
              Website: tires.myjiffylube.ai
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

export default SmsConsent;
