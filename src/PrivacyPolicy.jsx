// =============================================================================
// PRIVACY POLICY PAGE
// =============================================================================
// Route: #/privacy-policy
// Purpose: Privacy policy for P.C.J.L., Inc. operating Jiffy Lube MultiCare
// Adapted from JLI franchise privacy policy template
// Includes CCPA compliance for California operations
// =============================================================================

import React from 'react';

const JL_LOGO = '/images/JL_Multicare_Horz_1C.png';

// Shared page wrapper styles
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
  subsectionTitle: {
    color: '#334155',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '10px',
    marginTop: '20px',
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

const PrivacyPolicy = () => {
  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>

        {/* Header */}
        <div style={pageStyles.header}>
          <a href="#/">
            <img src={JL_LOGO} alt="Jiffy Lube MultiCare" style={pageStyles.logo} />
          </a>
          <h1 style={pageStyles.title}>Privacy Policy</h1>
        </div>

        {/* Content */}
        <div style={pageStyles.content}>

          <a href="#/" style={pageStyles.backLink}>← Back to Tire Finder</a>

          <p style={{ ...pageStyles.paragraph, fontStyle: 'italic', color: '#64748b' }}>
            Last Updated: May 2026
          </p>

          {/* Introduction */}
          <section style={pageStyles.section}>
            <p style={pageStyles.paragraph}>
              This is the Privacy Policy of P.C.J.L., Inc., operating Jiffy Lube MultiCare service centers 
              in California ("we", "us", "our"). P.C.J.L., Inc. is an independently owned and operated 
              franchisee of Jiffy Lube International, Inc. This Policy applies to all information transmitted 
              or submitted to us, whether provided at one of our Jiffy Lube MultiCare service centers or via 
              any of our customer-facing applications (including tires.myjiffylube.ai and 
              greets.myjiffylube.ai), phone, text or SMS message, email, or any other written 
              or oral communication with us.
            </p>
            <p style={pageStyles.paragraph}>
              We highly value our customer relationships and created this Policy to describe to you the 
              information we collect about you, how that information may be used, with whom it may be shared, 
              how you may access the information you provide us, and your choices about such uses and disclosures.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>1. Information We Collect</h2>

            <h3 style={pageStyles.subsectionTitle}>Information You Provide</h3>
            <p style={pageStyles.paragraph}>
              We may collect and store personal information you provide to us, including:
            </p>
            <ul style={pageStyles.list}>
              <li>Your name, mailing address, email address, and telephone number (including for use with verification codes sent via SMS to confirm your identity when using our customer-facing applications)</li>
              <li>Vehicle information (year, make, model, license plate number)</li>
              <li>Tire service history and tire condition assessments (tread depth readings)</li>
              <li>Payment information (when using our PayPal invoice service)</li>
              <li>Any other information you voluntarily provide when requesting a tire quote or service</li>
            </ul>

            <h3 style={pageStyles.subsectionTitle}>Information Collected Automatically</h3>
            <p style={pageStyles.paragraph}>
              When you visit our website, we may automatically collect certain information about your device 
              and usage, including your IP address, browser type, referring URL, and pages visited. We use 
              this information to improve our website and services.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Information from Other Sources</h3>
            <p style={pageStyles.paragraph}>
              We may obtain information about you from other sources within the Jiffy Lube franchise network, 
              business partners, and service providers. This may include vehicle service history from your 
              visits to other Jiffy Lube locations.
            </p>
          </section>

          {/* 2. How We Use Your Information */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>2. How We Use Your Information</h2>
            <p style={pageStyles.paragraph}>
              We may use the information we collect about you to:
            </p>
            <ul style={pageStyles.list}>
              <li>Generate and deliver tire quotes and service estimates</li>
              <li>Send you your tire quote via email, SMS text message, or print</li>
              <li>Send you one-time verification codes via SMS text message to confirm your identity when you use our customer-facing applications (including our tire finder, quote retrieval, and self-service intake kiosks at Jiffy Lube MultiCare locations)</li>
              <li>Process payments through our PayPal invoice service</li>
              <li>Manage your customer relationship and provide customer service</li>
              <li>Communicate with you about your vehicle service needs, appointments, and service updates</li>
              <li>Perform research and analysis to improve our products and services</li>
              <li>Comply with legal and regulatory requirements</li>
              <li>Perform functions as otherwise described to you at the time of collection</li>
            </ul>
          </section>

          {/* 3. With Whom We Share Your Information */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>3. With Whom We Share Your Information</h2>
            <p style={pageStyles.paragraph}>
              We do not sell your personal information. We do not share your personal information with 
              others except as described in this Policy or when we inform you and give you an opportunity 
              to opt out.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Authorized Service Providers</h3>
            <p style={pageStyles.paragraph}>
              We may share your personal information with authorized service providers that perform services 
              on our behalf, including email delivery (SendGrid), SMS messaging (Telnyx), payment processing 
              (PayPal), and data hosting (Supabase). These providers may have access to personal information 
              needed to perform their functions but are not permitted to use it for any other purposes.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Jiffy Lube Franchise Network</h3>
            <p style={pageStyles.paragraph}>
              We may share information within the Jiffy Lube franchise network to provide you with information 
              about your vehicle service history and products and services that might interest you. All 
              franchisees are required to comply with applicable privacy and data security laws.
            </p>

            <h3 style={pageStyles.subsectionTitle}>Other Situations</h3>
            <p style={pageStyles.paragraph}>
              We may also disclose your personal information in response to a subpoena or court order; to 
              establish or exercise our legal rights; to defend against legal claims; when we believe disclosure 
              is appropriate in connection with efforts to investigate or prevent illegal activity or fraud; 
              to protect the rights, property, or safety of our company, customers, or employees; or in 
              connection with a corporate transaction such as a merger or asset sale.
            </p>
          </section>

          {/* 4. Your Choices */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>4. Your Choices</h2>
            <p style={pageStyles.paragraph}>
              You may choose not to provide us with certain information. However, certain information may be 
              required to generate a tire quote or process a service request.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Email Communications:</strong> You may opt out of receiving promotional emails by 
              contacting us at support@myjiffylube.com or by following the unsubscribe instructions in any 
              promotional email we send.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>SMS/Text Messages:</strong> We send two distinct types of SMS messages: (1) tire 
              quote delivery and follow-up messages, which require your verbal opt-in at one of our service 
              centers, and (2) one-time verification codes sent to confirm your identity when using our 
              customer-facing applications, which you initiate by entering your phone number and tapping a 
              button to request a code. You may opt out of either type at any time by replying STOP to any 
              message. For details, see our{' '}
              <a href="#/sms-consent" style={{ color: '#8b1538' }}>SMS Consent & Terms</a> page.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>SMS Privacy:</strong> We will not share your opt-in to our SMS campaigns (including 
              both tire quote messaging and identity verification codes) with any third party for purposes 
              unrelated to providing you with the services of those campaigns. We may share 
              your personal data, including your SMS opt-in or consent status, with third parties that help us 
              provide our messaging services, including but not limited to platform providers, phone companies, 
              and any other vendors who assist us in the delivery of text messages. We do not sell, rent, or 
              otherwise share your mobile phone number or SMS consent information with third parties for 
              promotional or marketing purposes. All of the above categories exclude text messaging originator 
              opt-in data and consent; this information will not be shared with any third parties.
            </p>
            <p style={pageStyles.paragraph}>
              <strong>Do Not Call:</strong> You may instruct us not to call you for marketing purposes by 
              contacting us at support@myjiffylube.com or calling our office at (805) 354-7077.
            </p>
          </section>

          {/* 5. How We Protect Your Information */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>5. How We Protect Your Information</h2>
            <p style={pageStyles.paragraph}>
              We take appropriate security measures (including physical, electronic, and procedural measures) 
              to help safeguard your personal information from unauthorized access and disclosure. We use 
              encryption in the transmission of sensitive information and maintain access controls to limit 
              who can view personal data. Although we take steps to secure your information, no data 
              protection system can be guaranteed to be 100% secure.
            </p>
          </section>

          {/* 6. California Privacy Rights (CCPA) */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>6. California Privacy Rights</h2>
            <p style={pageStyles.paragraph}>
              As a California business serving California residents, we comply with the California Consumer 
              Privacy Act (CCPA) and the California Privacy Rights Act (CPRA). California residents have 
              the following rights:
            </p>
            <ul style={pageStyles.list}>
              <li><strong>Right to Know:</strong> You may request information about the categories and specific 
                pieces of personal information we have collected about you, the sources of that information, 
                the business purposes for collecting it, and the categories of third parties with whom we 
                share it.</li>
              <li><strong>Right to Delete:</strong> You may request that we delete personal information we 
                have collected from you, subject to certain legal exceptions.</li>
              <li><strong>Right to Correct:</strong> You may request that we correct inaccurate personal 
                information we maintain about you.</li>
              <li><strong>Right to Opt Out of Sale/Sharing:</strong> We do not sell your personal information. 
                For more information, see our{' '}
                <a href="#/do-not-sell" style={{ color: '#8b1538' }}>Do Not Sell My Personal Information</a> page.</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for 
                exercising any of your privacy rights.</li>
            </ul>
            <p style={pageStyles.paragraph}>
              To exercise any of these rights, please contact us at support@myjiffylube.com or call 
              (805) 354-7077. We will verify your identity before fulfilling your request.
            </p>
          </section>

          {/* 7. Children's Privacy */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>7. Children's Privacy</h2>
            <p style={pageStyles.paragraph}>
              Our website and services are not directed to children under the age of 13. We do not knowingly 
              collect personal information from children under 13. If we discover that a child under 13 has 
              provided us with personal information, we will promptly delete it.
            </p>
          </section>

          {/* 8. Changes to This Policy */}
          <section style={pageStyles.section}>
            <h2 style={pageStyles.sectionTitle}>8. Changes to This Privacy Policy</h2>
            <p style={pageStyles.paragraph}>
              We may update this Privacy Policy periodically to reflect changes in our practices and services. 
              When we post changes, we will revise the "Last Updated" date at the top of this page. We 
              recommend that you review this Policy periodically to stay informed about how we protect your 
              information.
            </p>
          </section>

          {/* 9. Contact Us */}
          <section style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: '#8b1538', fontSize: '18px', marginBottom: '15px' }}>
              Contact Us
            </h2>
            <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '15px', margin: '0' }}>
              If you have questions about this Privacy Policy or our information-handling practices, 
              please contact us:
            </p>
            <p style={{ color: '#475569', lineHeight: '1.8', fontSize: '15px', marginTop: '15px', marginBottom: '0' }}>
              <strong>P.C.J.L., Inc.</strong><br />
              Operating Jiffy Lube MultiCare locations in California<br />
              1440 Jason Way STE 100<br />
              Santa Maria, CA 93455<br />
              Phone: (805) 354-7077<br />
              Email: support@myjiffylube.com
            </p>
          </section>

        </div>

        {/* Footer */}
        <div style={pageStyles.footer}>
          <p style={{ margin: '0 0 8px 0' }}>
            <a href="#/privacy-policy" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#/terms" style={{ color: '#64748b', marginRight: '15px', textDecoration: 'none' }}>Terms & Conditions</a>
            <a href="#/sms-consent" style={{ color: '#64748b', textDecoration: 'none' }}>SMS Terms</a>
          </p>
          <p style={{ margin: '0' }}>
            © 2026 P.C.J.L., Inc. Operating Jiffy Lube MultiCare locations in California
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
